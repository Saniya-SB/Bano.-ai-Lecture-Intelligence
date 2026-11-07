from typing import Any
import hashlib
import json
import logging
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from sqlalchemy import select

from backend.app.core.config import settings
from backend.app.core.exceptions import AppException
from backend.app.models.entities import Lecture, Transcript, TranscriptSegment, GeneratedOutput, UsageEvent
from backend.app.models.enums import SegmentType, OutputType, TranscriptVersion
from backend.app.schemas.llm import (
    CombinedExtractionResult,
    LearningMaterialsPayload,
    QuizGenerationResult,
    QuizPayload,
    TokenUsage,
)
from backend.app.services.llm.adapter import LLMProvider, get_llm_provider
from backend.app.services.llm.chunker import chunk_transcript_segments
from backend.app.services.llm.prompts import (
    SYSTEM_INSTRUCTION,
    USER_EXTRACTION_PROMPT_TEMPLATE,
    QUIZ_SYSTEM_INSTRUCTION,
    QUIZ_USER_PROMPT_TEMPLATE,
)

logger = logging.getLogger(__name__)


def compute_transcript_hash(segments: list[TranscriptSegment]) -> str:
    """
    Computes a deterministic SHA256 hash of all segments (ids, times, and text).
    """
    hasher = hashlib.sha256()
    for s in sorted(segments, key=lambda x: x.start_time):
        hasher.update(f"{s.id}:{s.start_time:.2f}:{s.end_time:.2f}:{s.text}".encode("utf-8"))
    return hasher.hexdigest()


def compute_cache_key(transcript_hash: str, prompt_version: str, task: str = "materials") -> str:
    """
    Computes cache key: SHA256(task + transcript_hash + prompt_version).
    """
    raw = f"{task}:{transcript_hash}:{prompt_version}"
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()


class LearningMaterialService:
    def __init__(self, provider: LLMProvider | None = None):
        self.provider = provider or get_llm_provider()

    def _verify_privacy_tier(self, lecture: Lecture) -> None:
        """
        Enforces that in free mode, ONLY lectures explicitly flagged as test data
        (is_test_data == True) are permitted to route to external LLMs.
        In production, LLM_TIER=free and is_test_data bypasses are completely forbidden.
        """
        if settings.ENVIRONMENT == "production" and settings.LLM_TIER == "free":
            err_msg = "CRITICAL_PRIVACY_VIOLATION: LLM_TIER=free is forbidden in production environment."
            logger.error(err_msg)
            raise AppException(
                status_code=403,
                message=err_msg,
                code="PRIVACY_GUARD_BLOCKED"
            )

        if settings.LLM_TIER == "free":
            is_test = False if settings.ENVIRONMENT == "production" else getattr(lecture, "is_test_data", False)
            if not is_test:
                err_msg = (
                    "CRITICAL_PRIVACY_VIOLATION: LLM_TIER is set to 'free'. "
                    "Provider terms allow model training on free-tier requests. "
                    "Only lectures with is_test_data=True are permitted. "
                    f"Lecture {lecture.id} is non-test data and is blocked."
                )
                logger.error(err_msg)
                raise AppException(
                    status_code=403,
                    message=err_msg,
                    code="PRIVACY_GUARD_BLOCKED"
                )
            else:
                logger.warning(
                    f"PRIVACY_NOTICE: Processing lecture {lecture.id} under LLM_TIER='free' "
                    "because it is explicitly marked as is_test_data=True."
                )

    async def generate_learning_materials(
        self,
        lecture_id: str,
        user_id: str,
        db: Session,
        force_refresh: bool = False,
    ) -> LearningMaterialsPayload:
        """
        Processes transcript segments, applies segment classification, extracts materials,
        checks cache by (transcript_hash + prompt_version) per user, and records usage.
        """
        # 1. Fetch lecture & check ownership
        lecture = db.scalar(
            select(Lecture).where(Lecture.id == lecture_id, Lecture.user_id == user_id)
        )
        if not lecture:
            raise AppException(status_code=404, message="Lecture not found", code="NOT_FOUND")

        # 2. Strict Privacy Guard
        self._verify_privacy_tier(lecture)

        # 3. Retrieve transcript segments
        transcript = db.execute(
            select(Transcript).where(
                Transcript.lecture_id == lecture_id,
                Transcript.version_type == TranscriptVersion.NORMALISED.value,
            )
        ).scalar_one_or_none()

        if not transcript:
            # Fallback to Roman or raw
            transcript = db.execute(
                select(Transcript).where(Transcript.lecture_id == lecture_id)
            ).scalars().first()

        if not transcript:
            raise AppException(
                status_code=400,
                message="No transcript available for this lecture to generate materials",
                code="TRANSCRIPT_MISSING"
            )

        segments = db.execute(
            select(TranscriptSegment)
            .where(TranscriptSegment.transcript_id == transcript.id)
            .order_by(TranscriptSegment.start_time)
        ).scalars().all()

        if not segments:
            raise AppException(
                status_code=400,
                message="Transcript contains no segments",
                code="TRANSCRIPT_EMPTY"
            )

        # 4. Check Cache
        t_hash = compute_transcript_hash(segments)
        cache_key = compute_cache_key(t_hash, settings.LLM_PROMPT_VERSION, task="combined_materials")

        if not force_refresh:
            cached_record = db.scalar(
                select(GeneratedOutput).where(
                    GeneratedOutput.user_id == user_id,
                    GeneratedOutput.cache_key == cache_key,
                )
            )
            if cached_record and cached_record.content:
                logger.info(f"Cache hit for lecture {lecture_id} materials with key {cache_key}")
                content = cached_record.content
                token_usage_dict = cached_record.token_usage or {}
                return LearningMaterialsPayload(
                    lecture_id=lecture_id,
                    prompt_version=settings.LLM_PROMPT_VERSION,
                    model_name=cached_record.model_name,
                    cache_hit=True,
                    token_usage=TokenUsage(**token_usage_dict),
                    summary=content["summary"],
                    notes=content["notes"],
                    key_concepts=content["key_concepts"],
                    glossary=content["glossary"],
                    important_questions=content["important_questions"],
                    announcements=content.get("announcements", []),
                )

        # 5. Chunk transcript (single chunk for standard lecture within context window)
        chunks = chunk_transcript_segments(segments)
        if not chunks:
            raise AppException(status_code=400, message="Failed to chunk transcript", code="CHUNKING_ERROR")

        # Combine or execute extraction call
        # For transcripts fitting in 1 chunk:
        chunk_text = chunks[0].format_for_prompt()
        prompt = USER_EXTRACTION_PROMPT_TEMPLATE.format(
            title=lecture.title,
            subject=lecture.subject,
            topic=lecture.topic or "General",
            formatted_transcript=chunk_text,
        )

        llm_resp = await self.provider.generate_structured(
            prompt=prompt,
            system_instruction=SYSTEM_INSTRUCTION,
            response_model=CombinedExtractionResult,
        )

        extracted: CombinedExtractionResult = llm_resp.parsed

        # 6. Apply Segment Classifications to Database Segments
        # Update segment_type on all matching transcript segments (and never delete off_topic)
        classification_map = {item.segment_id: item.segment_type for item in extracted.segment_classifications}
        for seg in segments:
            if seg.id in classification_map:
                stype = classification_map[seg.id].lower()
                if stype in [SegmentType.CONCEPT.value, SegmentType.EXAMPLE.value, SegmentType.ADMIN.value, SegmentType.OFF_TOPIC.value]:
                    seg.segment_type = stype
                else:
                    seg.segment_type = SegmentType.CONCEPT.value

        # Also update corresponding Roman transcript segments if present
        roman_transcript = db.execute(
            select(Transcript).where(
                Transcript.lecture_id == lecture_id,
                Transcript.version_type == TranscriptVersion.ROMAN.value,
            )
        ).scalar_one_or_none()
        if roman_transcript:
            rom_segments = db.execute(
                select(TranscriptSegment).where(TranscriptSegment.transcript_id == roman_transcript.id)
            ).scalars().all()
            for r_seg in rom_segments:
                if r_seg.id in classification_map:
                    r_seg.segment_type = classification_map[r_seg.id]

        # 7. Persist to GeneratedOutput cache
        token_usage = TokenUsage(
            prompt_tokens=llm_resp.prompt_tokens,
            completion_tokens=llm_resp.completion_tokens,
            total_tokens=llm_resp.total_tokens,
            estimated_cost_usd=llm_resp.estimated_cost_usd,
        )

        content_dict = {
            "summary": extracted.summary.model_dump(),
            "notes": [n.model_dump() for n in extracted.notes],
            "key_concepts": [k.model_dump() for k in extracted.key_concepts],
            "glossary": [g.model_dump() for g in extracted.glossary],
            "important_questions": [q.model_dump() for q in extracted.important_questions],
            "announcements": [a.model_dump() for a in extracted.announcements],
        }

        import uuid
        out_id = f"out_{uuid.uuid4().hex[:12]}"
        db_output = GeneratedOutput(
            id=out_id,
            lecture_id=lecture_id,
            user_id=user_id,
            output_type=OutputType.NOTES.value,
            prompt_version=settings.LLM_PROMPT_VERSION,
            cache_key=cache_key,
            content=content_dict,
            model_name=llm_resp.model_name,
            token_usage=token_usage.model_dump(),
        )
        db.add(db_output)

        # 8. Record Usage Event for cost tracking
        usage_event = UsageEvent(
            id=f"use_{uuid.uuid4().hex[:12]}",
            user_id=user_id,
            lecture_id=lecture_id,
            event_type="llm_materials_generation",
            quantity=llm_resp.total_tokens,
            estimated_cost_usd=llm_resp.estimated_cost_usd,
            metadata_json={
                "model_name": llm_resp.model_name,
                "prompt_tokens": llm_resp.prompt_tokens,
                "completion_tokens": llm_resp.completion_tokens,
                "prompt_version": settings.LLM_PROMPT_VERSION,
            }
        )
        db.add(usage_event)
        db.commit()

        return LearningMaterialsPayload(
            lecture_id=lecture_id,
            prompt_version=settings.LLM_PROMPT_VERSION,
            model_name=llm_resp.model_name,
            cache_hit=False,
            token_usage=token_usage,
            summary=extracted.summary,
            notes=extracted.notes,
            key_concepts=extracted.key_concepts,
            glossary=extracted.glossary,
            important_questions=extracted.important_questions,
            announcements=extracted.announcements,
        )

    async def generate_quiz(
        self,
        lecture_id: str,
        user_id: str,
        db: Session,
        num_questions: int = 5,
    ) -> QuizPayload:
        """
        Generates on-demand multiple-choice quiz questions based strictly on concept/example segments.
        """
        lecture = db.scalar(
            select(Lecture).where(Lecture.id == lecture_id, Lecture.user_id == user_id)
        )
        if not lecture:
            raise AppException(status_code=404, message="Lecture not found", code="NOT_FOUND")

        self._verify_privacy_tier(lecture)

        transcript = db.execute(
            select(Transcript).where(Transcript.lecture_id == lecture_id)
        ).scalars().first()

        if not transcript:
            raise AppException(status_code=400, message="No transcript available", code="TRANSCRIPT_MISSING")

        # Fetch only concept and example segments
        eligible_segments = db.execute(
            select(TranscriptSegment)
            .where(
                TranscriptSegment.transcript_id == transcript.id,
                TranscriptSegment.segment_type.in_([SegmentType.CONCEPT.value, SegmentType.EXAMPLE.value]),
            )
            .order_by(TranscriptSegment.start_time)
        ).scalars().all()

        if not eligible_segments:
            # Fallback to all segments if no segments were classified yet
            eligible_segments = db.execute(
                select(TranscriptSegment)
                .where(TranscriptSegment.transcript_id == transcript.id)
                .order_by(TranscriptSegment.start_time)
            ).scalars().all()

        formatted_lines = [
            f"[ID:{s.id} | {s.start_time:.1f}s - {s.end_time:.1f}s]: {s.text}"
            for s in eligible_segments
        ]
        formatted_text = "\n".join(formatted_lines)

        prompt = QUIZ_USER_PROMPT_TEMPLATE.format(
            title=lecture.title,
            subject=lecture.subject,
            topic=lecture.topic or "General",
            num_questions=num_questions,
            formatted_transcript=formatted_text,
        )

        llm_resp = await self.provider.generate_structured(
            prompt=prompt,
            system_instruction=QUIZ_SYSTEM_INSTRUCTION,
            response_model=QuizGenerationResult,
        )

        result: QuizGenerationResult = llm_resp.parsed

        token_usage = TokenUsage(
            prompt_tokens=llm_resp.prompt_tokens,
            completion_tokens=llm_resp.completion_tokens,
            total_tokens=llm_resp.total_tokens,
            estimated_cost_usd=llm_resp.estimated_cost_usd,
        )

        # Track usage
        import uuid
        usage_event = UsageEvent(
            id=f"use_{uuid.uuid4().hex[:12]}",
            user_id=user_id,
            lecture_id=lecture_id,
            event_type="llm_quiz_generation",
            quantity=llm_resp.total_tokens,
            estimated_cost_usd=llm_resp.estimated_cost_usd,
            metadata_json={
                "model_name": llm_resp.model_name,
                "prompt_tokens": llm_resp.prompt_tokens,
                "completion_tokens": llm_resp.completion_tokens,
                "num_questions": len(result.questions),
            }
        )
        db.add(usage_event)
        db.commit()

        return QuizPayload(
            lecture_id=lecture_id,
            model_name=llm_resp.model_name,
            token_usage=token_usage,
            questions=result.questions,
        )

