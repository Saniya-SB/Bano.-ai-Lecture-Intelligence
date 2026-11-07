import pytest
import json
from unittest.mock import AsyncMock, patch, MagicMock
from sqlalchemy.orm import Session
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from backend.app.core.config import settings
from backend.app.core.exceptions import AppException
from backend.app.db.base import Base
from backend.app.models.entities import User, Lecture, Transcript, TranscriptSegment, GeneratedOutput, UsageEvent
from backend.app.models.enums import SegmentType, TranscriptVersion
from backend.app.schemas.llm import (
    CombinedExtractionResult,
    SegmentClassificationItem,
    LectureSummary,
    NoteSection,
    KeyConcept,
    GlossaryTerm,
    ImportantQuestion,
    AnnouncementItem,
    TimeRange,
    QuizGenerationResult,
    QuizQuestion,
)
from backend.app.services.llm.adapter import LLMProvider, LLMResponse, GeminiProvider, OpenAIProvider, get_llm_provider
from backend.app.services.llm.service import LearningMaterialService, compute_transcript_hash, compute_cache_key
from backend.app.services.llm.chunker import chunk_transcript_segments, estimate_tokens


# --- Database Fixture ---

@pytest.fixture
def db_session():
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(bind=engine)
    session_factory = sessionmaker(bind=engine)
    session = session_factory()

    # Seed mock user
    user = User(id="usr_test_1", email="test@bano.ai", full_name="Test User")
    session.add(user)
    session.commit()

    yield session
    session.close()


@pytest.fixture
def mock_lecture_with_transcript(db_session: Session):
    user_id = "usr_test_1"
    lecture = Lecture(
        id="lec_test_101",
        user_id=user_id,
        title="Data Structures - BST",
        subject="Computer Science",
        topic="Binary Search Tree",
        duration_seconds=120,
        is_test_data=True,  # explicitly marked as test data
    )
    db_session.add(lecture)

    transcript = Transcript(
        id="tr_101",
        lecture_id=lecture.id,
        version_type=TranscriptVersion.NORMALISED.value,
        full_text="Sample full text",
    )
    db_session.add(transcript)

    segments = [
        TranscriptSegment(
            id="seg_1",
            transcript_id=transcript.id,
            segment_index=0,
            start_time=0.0,
            end_time=15.0,
            text="Attendance sheet sign kar do sabhi students.",
            segment_type=SegmentType.CONCEPT.value,
        ),
        TranscriptSegment(
            id="seg_2",
            transcript_id=transcript.id,
            segment_index=1,
            start_time=15.0,
            end_time=45.0,
            text="Kal ka cricket match dekha tha? Kya finish kiya tha!",
            segment_type=SegmentType.CONCEPT.value,
        ),
        TranscriptSegment(
            id="seg_3",
            transcript_id=transcript.id,
            segment_index=2,
            start_time=45.0,
            end_time=90.0,
            text="Binary Search Tree mein har node ka left child usse chhota hota hai.",
            segment_type=SegmentType.CONCEPT.value,
        ),
        TranscriptSegment(
            id="seg_4",
            transcript_id=transcript.id,
            segment_index=3,
            start_time=90.0,
            end_time=120.0,
            text="For example, agar root 10 hai to left mein 5 aur right mein 15 aayega.",
            segment_type=SegmentType.CONCEPT.value,
        ),
    ]
    db_session.add_all(segments)
    db_session.commit()

    return lecture, transcript, segments


# --- Unit Tests: Token Estimation & Chunker ---

def test_estimate_tokens():
    assert estimate_tokens("hello") >= 1
    assert estimate_tokens("a" * 40) == 10


def test_chunk_transcript_segments():
    segs = [
        TranscriptSegment(id=f"s_{i}", start_time=float(i), end_time=float(i+1), text="Node insertion in tree.")
        for i in range(10)
    ]
    chunks = chunk_transcript_segments(segs, max_tokens=50, overlap_tokens=10)
    assert len(chunks) >= 1
    assert "ID:s_0" in chunks[0].format_for_prompt()


# --- Unit Tests: Privacy Guard (LLM_TIER=free) ---

@pytest.mark.asyncio
async def test_llm_tier_free_blocks_non_test_data(db_session: Session, mock_lecture_with_transcript):
    lecture, _, _ = mock_lecture_with_transcript
    lecture.is_test_data = False
    db_session.commit()

    service = LearningMaterialService()
    with patch.object(settings, "LLM_TIER", "free"):
        with pytest.raises(AppException) as exc_info:
            await service.generate_learning_materials(lecture.id, lecture.user_id, db_session)
        assert exc_info.value.status_code == 403
        assert "PRIVACY_GUARD_BLOCKED" in exc_info.value.code


@pytest.mark.asyncio
async def test_llm_tier_free_permits_explicit_test_data(db_session: Session, mock_lecture_with_transcript):
    lecture, _, _ = mock_lecture_with_transcript
    lecture.is_test_data = True
    db_session.commit()

    mock_llm_result = CombinedExtractionResult(
        segment_classifications=[
            SegmentClassificationItem(segment_id="seg_1", segment_type="admin"),
            SegmentClassificationItem(segment_id="seg_2", segment_type="off_topic"),
            SegmentClassificationItem(segment_id="seg_3", segment_type="concept"),
            SegmentClassificationItem(segment_id="seg_4", segment_type="example"),
        ],
        summary=LectureSummary(short="BST basics.", detailed="Covers BST rules and examples."),
        notes=[
            NoteSection(
                heading="BST Invariant",
                bullet_points=["Left child is smaller, right child is greater."],
                referenced_segment_ids=["seg_3"],
                referenced_time_ranges=[TimeRange(start=45.0, end=90.0)],
            )
        ],
        key_concepts=[
            KeyConcept(
                concept="BST Invariant",
                explanation="Binary tree ordering property.",
                referenced_segment_ids=["seg_3"],
                referenced_time_ranges=[TimeRange(start=45.0, end=90.0)],
            )
        ],
        glossary=[
            GlossaryTerm(term="BST", definition="Binary Search Tree", referenced_time_ranges=[TimeRange(start=45.0, end=90.0)])
        ],
        important_questions=[
            ImportantQuestion(
                question="What is BST property?",
                suggested_answer="Left < Root < Right",
                referenced_time_ranges=[TimeRange(start=45.0, end=90.0)],
            )
        ],
        announcements=[
            AnnouncementItem(text="Attendance sheet sign kar do", referenced_time_ranges=[TimeRange(start=0.0, end=15.0)])
        ],
    )

    mock_provider = MagicMock(spec=LLMProvider)
    mock_provider.generate_structured = AsyncMock(
        return_value=LLMResponse(
            parsed=mock_llm_result,
            raw_text="{}",
            model_name="gemini-3.1-flash-lite",
            prompt_tokens=500,
            completion_tokens=200,
            total_tokens=700,
            estimated_cost_usd=0.000425,
        )
    )

    service = LearningMaterialService(provider=mock_provider)
    with patch.object(settings, "LLM_TIER", "free"):
        res = await service.generate_learning_materials(lecture.id, lecture.user_id, db_session)
        assert res.lecture_id == lecture.id
        assert res.is_ai_generated is True
        assert res.cache_hit is False
        assert len(res.announcements) == 1
        assert res.announcements[0].text == "Attendance sheet sign kar do"

        # Verify segments were classified in DB (and off_topic is NOT deleted)
        seg1 = db_session.get(TranscriptSegment, "seg_1")
        seg2 = db_session.get(TranscriptSegment, "seg_2")
        seg3 = db_session.get(TranscriptSegment, "seg_3")
        assert seg1.segment_type == "admin"
        assert seg2.segment_type == "off_topic"
        assert seg3.segment_type == "concept"

        # Verify cache was written
        cached = db_session.query(GeneratedOutput).filter_by(lecture_id=lecture.id).first()
        assert cached is not None
        assert cached.token_usage["total_tokens"] == 700


@pytest.mark.asyncio
async def test_learning_materials_caching(db_session: Session, mock_lecture_with_transcript):
    lecture, _, _ = mock_lecture_with_transcript
    lecture.is_test_data = True
    db_session.commit()

    mock_llm_result = CombinedExtractionResult(
        segment_classifications=[
            SegmentClassificationItem(segment_id="seg_1", segment_type="admin"),
            SegmentClassificationItem(segment_id="seg_2", segment_type="off_topic"),
            SegmentClassificationItem(segment_id="seg_3", segment_type="concept"),
            SegmentClassificationItem(segment_id="seg_4", segment_type="example"),
        ],
        summary=LectureSummary(short="BST basics.", detailed="Covers BST rules and examples."),
        notes=[],
        key_concepts=[],
        glossary=[],
        important_questions=[],
        announcements=[],
    )

    mock_provider = MagicMock(spec=LLMProvider)
    mock_provider.generate_structured = AsyncMock(
        return_value=LLMResponse(
            parsed=mock_llm_result,
            raw_text="{}",
            model_name="gemini-3.1-flash-lite",
            prompt_tokens=400,
            completion_tokens=150,
            total_tokens=550,
            estimated_cost_usd=0.0003,
        )
    )

    service = LearningMaterialService(provider=mock_provider)
    # First call: cache miss
    res1 = await service.generate_learning_materials(lecture.id, lecture.user_id, db_session)
    assert res1.cache_hit is False
    assert mock_provider.generate_structured.call_count == 1

    # Second call: cache hit!
    res2 = await service.generate_learning_materials(lecture.id, lecture.user_id, db_session)
    assert res2.cache_hit is True
    # LLM should not have been called a second time
    assert mock_provider.generate_structured.call_count == 1


@pytest.mark.asyncio
async def test_on_demand_quiz_generation(db_session: Session, mock_lecture_with_transcript):
    lecture, _, _ = mock_lecture_with_transcript
    lecture.is_test_data = True
    db_session.commit()

    mock_quiz_result = QuizGenerationResult(
        questions=[
            QuizQuestion(
                id="q_1",
                question="Where are smaller nodes stored relative to parent?",
                options=["Left child", "Right child", "Top", "Bottom"],
                correct_option_index=0,
                explanation="Left child is strictly less by BST invariant.",
                referenced_segment_ids=["seg_3"],
                referenced_time_ranges=[TimeRange(start=45.0, end=90.0)],
            )
        ]
    )

    mock_provider = MagicMock(spec=LLMProvider)
    mock_provider.generate_structured = AsyncMock(
        return_value=LLMResponse(
            parsed=mock_quiz_result,
            raw_text="{}",
            model_name="gemini-3.1-flash-lite",
            prompt_tokens=300,
            completion_tokens=100,
            total_tokens=400,
            estimated_cost_usd=0.0002,
        )
    )

    service = LearningMaterialService(provider=mock_provider)
    quiz_res = await service.generate_quiz(lecture.id, lecture.user_id, db_session, num_questions=1)
    assert quiz_res.lecture_id == lecture.id
    assert len(quiz_res.questions) == 1
    assert quiz_res.questions[0].correct_option_index == 0
    assert quiz_res.is_ai_generated is True

    # Check UsageEvent tracked
    events = db_session.query(UsageEvent).filter_by(lecture_id=lecture.id).all()
    assert len(events) >= 1
    assert events[0].event_type == "llm_quiz_generation"


# --- Provider Unit Tests with Mocked HTTP ---

@pytest.mark.asyncio
async def test_gemini_provider_json_retry():
    mock_client = MagicMock()
    # First response malformed, second response valid JSON
    resp1 = MagicMock(status_code=200)
    resp1.json.return_value = {
        "candidates": [{"content": {"parts": [{"text": "not valid json {"}]}}],
        "usageMetadata": {"promptTokenCount": 100, "candidatesTokenCount": 50},
    }

    valid_dict = {
        "questions": [
            {
                "id": "q1",
                "question": "Sample?",
                "options": ["A", "B", "C", "D"],
                "correct_option_index": 1,
                "explanation": "Because B.",
                "referenced_segment_ids": [],
                "referenced_time_ranges": [],
            }
        ]
    }
    resp2 = MagicMock(status_code=200)
    resp2.json.return_value = {
        "candidates": [{"content": {"parts": [{"text": json.dumps(valid_dict)}]}}],
        "usageMetadata": {"promptTokenCount": 110, "candidatesTokenCount": 60},
    }

    mock_client.post = AsyncMock(side_effect=[resp1, resp2])
    provider = GeminiProvider(api_key="test_key", http_client=mock_client)

    result = await provider.generate_structured("prompt", "sys", QuizGenerationResult)
    assert isinstance(result.parsed, QuizGenerationResult)
    assert result.parsed.questions[0].id == "q1"
    assert mock_client.post.call_count == 2


# --- Real API Live Test under separate pytest marker ---

@pytest.mark.real_api
@pytest.mark.asyncio
async def test_real_gemini_api_call(db_session: Session):
    """
    Live end-to-end test against real Google Gemini API using configured GEMINI_API_KEY
    and a lecture explicitly flagged is_test_data=True.
    Run explicitly with: pytest -m "real_api" -s
    """
    if not settings.GEMINI_API_KEY:
        pytest.skip("No GEMINI_API_KEY configured in environment")

    user_id = "usr_test_1"
    lecture = Lecture(
        id="lec_real_eval_1",
        user_id=user_id,
        title="Engineering CS - Binary Search Tree Basics",
        subject="Computer Science",
        topic="BST Property & Traversal",
        duration_seconds=30,
        is_test_data=True,  # Mandatory for free tier
    )
    db_session.add(lecture)

    transcript = Transcript(
        id="tr_real_eval_1",
        lecture_id=lecture.id,
        version_type=TranscriptVersion.NORMALISED.value,
        full_text="BST short lecture",
    )
    db_session.add(transcript)

    segments = [
        TranscriptSegment(
            id="seg_live_1",
            transcript_id=transcript.id,
            segment_index=0,
            start_time=0.0,
            end_time=10.0,
            text="Attendance sheet circulate ho rahi hai, please sabhi sign kar do.",
            segment_type=SegmentType.CONCEPT.value,
        ),
        TranscriptSegment(
            id="seg_live_2",
            transcript_id=transcript.id,
            segment_index=1,
            start_time=10.0,
            end_time=20.0,
            text="Binary Search Tree mein har node ka left child root node se chhota hota hai aur right child bada hota hai.",
            segment_type=SegmentType.CONCEPT.value,
        ),
        TranscriptSegment(
            id="seg_live_3",
            transcript_id=transcript.id,
            segment_index=2,
            start_time=20.0,
            end_time=30.0,
            text="Kal sabhi students assignment submit karenge, date extend nahi hogi.",
            segment_type=SegmentType.CONCEPT.value,
        ),
    ]
    db_session.add_all(segments)
    db_session.commit()

    service = LearningMaterialService()
    result = await service.generate_learning_materials(lecture.id, user_id, db_session)

    # Print raw shape & tokens for user review
    print("\n--- REAL GEMINI API EXECUTION OUTPUT ---")
    print(f"Model ID: {result.model_name}")
    print(f"Token Usage: {result.token_usage.model_dump()}")
    print(f"Summary Short: {result.summary.short}")
    print(f"Announcements: {[a.text for a in result.announcements]}")
    print(f"Notes Count: {len(result.notes)}")
    print(f"Glossary: {[g.term for g in result.glossary]}")
    print(f"Important Questions: {[q.question for q in result.important_questions]}")
    print("----------------------------------------\n")

    assert result.is_ai_generated is True
    assert result.token_usage.total_tokens > 0
    assert len(result.announcements) >= 1
    assert any("assignment" in a.text.lower() or "attendance" in a.text.lower() for a in result.announcements)

