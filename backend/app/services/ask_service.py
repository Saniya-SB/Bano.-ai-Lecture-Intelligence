"""
Ask this Lecture Service.
Performs retrieval without a vector DB:
- Scores transcript segments against student question using keyword overlap + technical lexicon
- Top segments (limit from settings.ASK_LECTURE_MAX_SEGMENTS) sent to LLM
- Strict refusal prompt ("This lecture does not cover this topic.")
- Caches by (lecture_id, question_hash, transcript_hash, provider, model, prompt_version) per user
- Per-user sliding window rate limiting
"""

import hashlib
import re
import time
import uuid
import logging
from typing import Any, List, Optional, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import select

from backend.app.core.config import settings
from backend.app.core.exceptions import AppException
from backend.app.models.entities import Lecture, Transcript, TranscriptSegment, GeneratedOutput, UsageEvent
from backend.app.models.enums import OutputType, TranscriptVersion, SegmentType
from backend.app.schemas.llm import AskLectureGenerationResult, AskLectureResponse
from backend.app.services.llm.adapter import LLMProvider, get_llm_provider
from backend.app.services.llm.service import compute_transcript_hash
from backend.app.services.llm.prompts import (
    ASK_LECTURE_SYSTEM_INSTRUCTION,
    ASK_LECTURE_USER_PROMPT_TEMPLATE,
)
from backend.app.services.transliteration.lexicon import DEFAULT_TECHNICAL_LEXICON

logger = logging.getLogger(__name__)

# In-memory sliding-window timestamps for rate limiting: user_id -> [timestamp_floats]
_user_ask_rate_history: dict[str, list[float]] = {}


def check_ask_rate_limit(user_id: str, max_per_minute: int) -> None:
    """Enforces sliding-window rate limit per user."""
    now = time.time()
    history = _user_ask_rate_history.setdefault(user_id, [])
    # Prune timestamps older than 60s
    valid_window = [t for t in history if now - t < 60.0]
    _user_ask_rate_history[user_id] = valid_window

    if len(valid_window) >= max_per_minute:
        raise AppException(
            status_code=429,
            message=f"Rate limit exceeded. Maximum {max_per_minute} questions per minute. Please wait a moment.",
            code="RATE_LIMIT_EXCEEDED",
        )
    _user_ask_rate_history[user_id].append(now)


def extract_keywords(text: str) -> set[str]:
    """Extracts lowercase alphabetic words of length >= 3, plus digits."""
    return set(re.findall(r"\b[a-zA-Z0-9_\u0900-\u097F]{2,}\b", text.lower()))


def score_segment(segment_text: str, question_terms: set[str], lexicon: dict[str, str]) -> float:
    """
    Scores a transcript segment against question terms.
    - Word overlap with question terms gives base score
    - If question contains technical lexicon term, matches count for 2.5x weight
    """
    seg_lower = segment_text.lower()
    score = 0.0

    for term in question_terms:
        if term in seg_lower:
            score += 1.0

    # Boost for technical terms
    for hi_term, en_term in lexicon.items():
        if (hi_term in question_terms or en_term in question_terms) and (hi_term in seg_lower or en_term in seg_lower):
            score += 2.5

    return score


def retrieve_top_segments(
    segments: List[TranscriptSegment],
    question: str,
    max_segments: int,
) -> List[TranscriptSegment]:
    """
    Ranks segments using lexical scoring and returns top `max_segments`.
    Never returns full transcript. If no segments match, returns the first few non-offtopic segments as minimal context.
    """
    question_terms = extract_keywords(question)
    scored: List[Tuple[float, TranscriptSegment]] = []

    for s in segments:
        # Off-topic segments have penalty
        penalty = 0.0 if s.segment_type != SegmentType.OFF_TOPIC.value else -5.0
        s_score = score_segment(s.text, question_terms, DEFAULT_TECHNICAL_LEXICON) + penalty
        scored.append((s_score, s))

    # Sort descending by score, tiebreak by original segment position
    scored.sort(key=lambda item: item[0], reverse=True)

    # Filter to top scoring
    top = [item[1] for item in scored[:max_segments]]
    # Re-order the selected top segments chronologically for natural LLM reading
    top.sort(key=lambda s: s.start_time)
    return top


class AskLectureService:
    def __init__(self, provider: Optional[LLMProvider] = None):
        self.provider = provider or get_llm_provider(with_fallback=True)

    async def ask_question(
        self,
        lecture_id: str,
        question: str,
        user_id: str,
        db: Session,
    ) -> AskLectureResponse:
        """
        Processes student question against lecture transcript with LLM.
        """
        # 1. Rate limiting
        check_ask_rate_limit(user_id, settings.ASK_LECTURE_RATE_LIMIT_PER_MINUTE)

        # 2. Ownership & lecture validation (IDOR prevention)
        lecture = db.scalar(
            select(Lecture).where(Lecture.id == lecture_id, Lecture.user_id == user_id)
        )
        if not lecture:
            raise AppException(status_code=404, message="Lecture not found", code="NOT_FOUND")

        # 3. Privacy Guard Check (consistent with LearningMaterialService)
        active_provider = getattr(self.provider, "provider_name", settings.LLM_PROVIDER).lower()
        if active_provider == "gemini":
            if settings.ENVIRONMENT == "production" and settings.LLM_TIER == "free":
                raise AppException(
                    status_code=403,
                    message="CRITICAL_PRIVACY_VIOLATION: LLM_TIER=free is forbidden in production environment.",
                    code="PRIVACY_GUARD_BLOCKED",
                )
            if settings.LLM_TIER == "free":
                is_test = False if settings.ENVIRONMENT == "production" else getattr(lecture, "is_test_data", False)
                if not is_test:
                    raise AppException(
                        status_code=403,
                        message="CRITICAL_PRIVACY_VIOLATION: LLM_TIER is set to 'free'. Lecture is not marked test data.",
                        code="PRIVACY_GUARD_BLOCKED",
                    )
        elif active_provider == "groq":
            if settings.ENVIRONMENT == "production" and settings.LLM_TIER == "free":
                raise AppException(
                    status_code=403,
                    message="Production environment strictly requires LLM_TIER='paid'.",
                    code="PRIVACY_GUARD_BLOCKED",
                )

        # 4. Fetch transcript & segments
        transcript = db.scalar(
            select(Transcript).where(Transcript.lecture_id == lecture_id)
        )
        if not transcript:
            raise AppException(status_code=400, message="No transcript available", code="TRANSCRIPT_MISSING")

        segments = db.scalars(
            select(TranscriptSegment)
            .where(TranscriptSegment.transcript_id == transcript.id)
            .order_by(TranscriptSegment.start_time)
        ).all()

        if not segments:
            return AskLectureResponse(
                answer="This lecture does not contain transcript segments.",
                is_ai_generated=True,
                answered=False,
            )

        transcript_hash = compute_transcript_hash(segments)
        question_hash = hashlib.sha256(question.strip().lower().encode("utf-8")).hexdigest()
        provider_name = getattr(self.provider, "provider_name", settings.LLM_PROVIDER).lower()
        model_name = getattr(self.provider, "model_name", settings.GEMINI_DEFAULT_MODEL)

        cache_key = (
            f"ask:{lecture_id}:{question_hash}:{transcript_hash}:"
            f"{provider_name}:{model_name}:{settings.ASK_LECTURE_PROMPT_VERSION}"
        )

        # 5. Check cache per user
        cached_output = db.scalar(
            select(GeneratedOutput).where(
                GeneratedOutput.user_id == user_id,
                GeneratedOutput.cache_key == cache_key,
            )
        )
        if cached_output and cached_output.content:
            data = cached_output.content
            return AskLectureResponse(
                answer=data.get("answer", ""),
                is_ai_generated=True,
                answered=bool(data.get("answered", False)),
            )

        # 6. Lexical retrieval of top segments
        top_segments = retrieve_top_segments(
            segments,
            question,
            max_segments=settings.ASK_LECTURE_MAX_SEGMENTS,
        )

        formatted_segments_lines = [
            f"[Segment ID: {s.id}]: {s.text}"
            for s in top_segments
        ]
        formatted_segments = "\n\n".join(formatted_segments_lines)

        user_prompt = ASK_LECTURE_USER_PROMPT_TEMPLATE.format(
            title=lecture.title,
            subject=lecture.subject,
            formatted_segments=formatted_segments,
            question=question,
        )

        # 7. LLM Completion via Provider Adapter (with fallback)
        llm_resp = await self.provider.generate_structured(
            prompt=user_prompt,
            system_instruction=ASK_LECTURE_SYSTEM_INSTRUCTION,
            response_model=AskLectureGenerationResult,
            temperature=0.1,
        )

        result: AskLectureGenerationResult = llm_resp.parsed

        # 8. Store in DB for caching and debugging (with internal segment references)
        content_dict = {
            "question": question,
            "answer": result.answer,
            "answered": result.answered,
            "referenced_segment_ids": [s.id for s in top_segments],
        }
        token_usage_dict = {
            "prompt_tokens": llm_resp.prompt_tokens,
            "completion_tokens": llm_resp.completion_tokens,
            "total_tokens": llm_resp.total_tokens,
            "estimated_cost_usd": llm_resp.estimated_cost_usd,
        }

        db_output = GeneratedOutput(
            id=f"out_{uuid.uuid4().hex[:12]}",
            lecture_id=lecture_id,
            user_id=user_id,
            output_type=OutputType.ASK_ANSWER.value,
            prompt_version=settings.ASK_LECTURE_PROMPT_VERSION,
            cache_key=cache_key,
            content=content_dict,
            model_name=llm_resp.model_name,
            token_usage=token_usage_dict,
        )
        db.add(db_output)

        # 9. Track token usage
        usage_event = UsageEvent(
            id=f"use_{uuid.uuid4().hex[:12]}",
            user_id=user_id,
            lecture_id=lecture_id,
            event_type="llm_ask_lecture",
            quantity=llm_resp.total_tokens,
            estimated_cost_usd=llm_resp.estimated_cost_usd,
            metadata_json={
                "model_name": llm_resp.model_name,
                "prompt_tokens": llm_resp.prompt_tokens,
                "completion_tokens": llm_resp.completion_tokens,
                "answered": result.answered,
            },
        )
        db.add(usage_event)
        db.commit()

        # 10. Clean return — no timestamps, no sources exposed
        return AskLectureResponse(
            answer=result.answer,
            is_ai_generated=True,
            answered=result.answered,
        )

