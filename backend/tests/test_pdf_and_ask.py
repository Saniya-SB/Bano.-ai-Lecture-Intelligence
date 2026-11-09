"""
Comprehensive tests for:
A. Export notes as PDF (GET /lectures/{id}/export/notes?format=pdf)
   - Owner-only authorization (returns 404 for other users / IDOR prevention)
   - Not-ready check (400 if notes not generated yet)
   - Correct content & format verification
B. "Ask this lecture" (POST /lectures/{id}/ask)
   - Owner-only authorization
   - Supported question (answered=True, grounded answer)
   - Unsupported question (answered=False, refusal)
   - Hinglish question
   - Privacy guard blocking under LLM_TIER=free when not is_test_data
   - Caching behavior (second identical call hits cache without calling LLM)
"""

import json
import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from fastapi.testclient import TestClient

from backend.app.main import app
from backend.app.models.entities import Lecture, User, GeneratedOutput, Transcript, TranscriptSegment
from backend.app.models.enums import OutputType, SegmentType
from backend.app.services.llm.adapter import LLMResponse
from backend.app.schemas.llm import AskLectureGenerationResult


@pytest.fixture
def auth_headers_user1():
    token = json.dumps({"id": "usr_test_ask_1", "email": "user1@bano.ai", "full_name": "User One"})
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def auth_headers_user2():
    token = json.dumps({"id": "usr_test_ask_2", "email": "user2@bano.ai", "full_name": "User Two"})
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def setup_lecture_with_notes_and_transcript(db_session):
    """Creates a complete test lecture belonging to usr_test_ask_1 with notes and segments."""
    user = User(id="usr_test_ask_1", email="user1@bano.ai", full_name="User One")
    db_session.add(user)

    lecture = Lecture(
        id="lec_pdf_ask_test",
        user_id="usr_test_ask_1",
        title="Binary Search Trees and Recursion",
        subject="Data Structures",
        topic="Trees",
        status="completed",
        is_test_data=True,
    )
    db_session.add(lecture)
    db_session.flush()

    # Add GeneratedOutput notes
    notes_content = {
        "notes": [
            {
                "heading": "BST Properties",
                "bullet_points": [
                    "In a BST, all keys in the left subtree are less than the node key.",
                    "All keys in the right subtree are greater than the node key.",
                ],
            },
            {
                "heading": "Recursion Base Case",
                "bullet_points": [
                    "A recursive function must terminate when a base condition is reached.",
                    "Without a base condition, stack overflow error will occur.",
                ],
            },
        ],
    }
    db_output = GeneratedOutput(
        id="out_notes_test_1",
        lecture_id=lecture.id,
        user_id=user.id,
        output_type=OutputType.NOTES.value,
        prompt_version="v1.0",
        cache_key=f"materials:{lecture.id}:v1.0",
        content=notes_content,
        model_name="mock-gemini",
    )
    db_session.add(db_output)

    # Add Transcript and segments
    transcript = Transcript(
        id="tr_pdf_ask_test",
        lecture_id=lecture.id,
        version_type="normalised",
        full_text="In a BST, the left child is smaller and right child is larger. Recursion needs a base condition.",
    )
    db_session.add(transcript)
    db_session.flush()

    seg1 = TranscriptSegment(
        id="seg_ask_1",
        transcript_id=transcript.id,
        segment_index=0,
        start_time=0.0,
        end_time=15.0,
        text="In a binary search tree, the left child is smaller than the parent, and the right child is greater.",
        segment_type=SegmentType.CONCEPT.value,
    )
    seg2 = TranscriptSegment(
        id="seg_ask_2",
        transcript_id=transcript.id,
        segment_index=1,
        start_time=15.0,
        end_time=30.0,
        text="Recursion tab chalegi jab tak base condition false hai. Agar base condition nahi hogi to stack overflow hoga.",
        segment_type=SegmentType.EXAMPLE.value,
    )
    db_session.add_all([seg1, seg2])
    db_session.commit()

    return lecture


# ============================================================================
# FEATURE A: PDF Export Tests
# ============================================================================

def test_export_notes_pdf_success(client: TestClient, setup_lecture_with_notes_and_transcript, auth_headers_user1):
    """Owner can download notes as PDF with correct headers and content."""
    lec = setup_lecture_with_notes_and_transcript
    res = client.get(f"/api/v1/lectures/{lec.id}/export/notes?format=pdf", headers=auth_headers_user1)
    assert res.status_code == 200
    assert res.headers["content-type"] == "application/pdf"
    assert "attachment;" in res.headers["content-disposition"]
    assert res.headers["content-disposition"].endswith('.pdf"')
    # Verify PDF magic bytes
    assert res.content.startswith(b"%PDF-")
    # Verify content contains reasonable PDF length
    assert len(res.content) > 500


def test_export_notes_pdf_owner_only(client: TestClient, setup_lecture_with_notes_and_transcript, auth_headers_user2):
    """Non-owner receives 404 (IDOR prevention)."""
    lec = setup_lecture_with_notes_and_transcript
    res = client.get(f"/api/v1/lectures/{lec.id}/export/notes?format=pdf", headers=auth_headers_user2)
    assert res.status_code == 404


def test_export_notes_pdf_invalid_format(client: TestClient, setup_lecture_with_notes_and_transcript, auth_headers_user1):
    """Unsupported format returns 400."""
    lec = setup_lecture_with_notes_and_transcript
    res = client.get(f"/api/v1/lectures/{lec.id}/export/notes?format=docx", headers=auth_headers_user1)
    assert res.status_code == 400


def test_export_notes_pdf_not_ready(client: TestClient, db_session, auth_headers_user1):
    """Returns 400 if notes have not been generated yet."""
    user = User(id="usr_not_ready", email="notready@bano.ai", full_name="Not Ready")
    db_session.add(user)
    lecture = Lecture(
        id="lec_not_ready",
        user_id="usr_test_ask_1",
        title="Unprocessed Lecture",
        subject="Physics",
        status="processing",
    )
    db_session.add(lecture)
    db_session.commit()

    res = client.get(f"/api/v1/lectures/{lecture.id}/export/notes?format=pdf", headers=auth_headers_user1)
    assert res.status_code == 400
    assert "not ready" in res.json().get("detail", "").lower()


# ============================================================================
# FEATURE B: "Ask This Lecture" Tests
# ============================================================================

@pytest.mark.asyncio
async def test_ask_lecture_supported_question(client: TestClient, setup_lecture_with_notes_and_transcript, auth_headers_user1):
    """Supported question returns answered=True and English answer from segments."""
    lec = setup_lecture_with_notes_and_transcript

    mock_result = AskLectureGenerationResult(
        answered=True,
        answer="In a binary search tree, the left child always holds a key smaller than the parent node, while the right child holds a key greater than the parent node."
    )
    mock_resp = LLMResponse(
        parsed=mock_result,
        raw_text="",
        model_name="gemini-3.1-flash-lite",
        prompt_tokens=300,
        completion_tokens=40,
        total_tokens=340,
        estimated_cost_usd=0.0001,
        provider_name="gemini",
    )

    with patch("backend.app.services.ask_service.get_llm_provider") as mock_get_provider:
        mock_provider_inst = MagicMock()
        mock_provider_inst.provider_name = "gemini"
        mock_provider_inst.model_name = "gemini-3.1-flash-lite"
        mock_provider_inst.generate_structured = AsyncMock(return_value=mock_resp)
        mock_get_provider.return_value = mock_provider_inst

        res = client.post(
            f"/api/v1/lectures/{lec.id}/ask",
            json={"question": "What is the key property of a binary search tree?"},
            headers=auth_headers_user1,
        )

        assert res.status_code == 200
        data = res.json()
        assert data["answered"] is True
        assert data["is_ai_generated"] is True
        assert "binary search tree" in data["answer"].lower()
        # Verify no timestamps or sources in user response
        assert "timestamp" not in data
        assert "referenced_segment_ids" not in data


@pytest.mark.asyncio
async def test_ask_lecture_unsupported_question(client: TestClient, setup_lecture_with_notes_and_transcript, auth_headers_user1):
    """Unsupported question returns answered=False and clean refusal."""
    lec = setup_lecture_with_notes_and_transcript

    mock_result = AskLectureGenerationResult(
        answered=False,
        answer="This lecture does not cover this topic."
    )
    mock_resp = LLMResponse(
        parsed=mock_result,
        raw_text="",
        model_name="gemini-3.1-flash-lite",
        prompt_tokens=250,
        completion_tokens=15,
        total_tokens=265,
        estimated_cost_usd=0.00008,
        provider_name="gemini",
    )

    with patch("backend.app.services.ask_service.get_llm_provider") as mock_get_provider:
        mock_provider_inst = MagicMock()
        mock_provider_inst.provider_name = "gemini"
        mock_provider_inst.model_name = "gemini-3.1-flash-lite"
        mock_provider_inst.generate_structured = AsyncMock(return_value=mock_resp)
        mock_get_provider.return_value = mock_provider_inst

        res = client.post(
            f"/api/v1/lectures/{lec.id}/ask",
            json={"question": "How do you calculate eigenvalues of a matrix?"},
            headers=auth_headers_user1,
        )

        assert res.status_code == 200
        data = res.json()
        assert data["answered"] is False
        assert "does not cover" in data["answer"].lower()


@pytest.mark.asyncio
async def test_ask_lecture_hinglish_question(client: TestClient, setup_lecture_with_notes_and_transcript, auth_headers_user1):
    """Hinglish question is retrieved and answered in English."""
    lec = setup_lecture_with_notes_and_transcript

    mock_result = AskLectureGenerationResult(
        answered=True,
        answer="If a recursive function lacks a base condition, it will trigger infinite calls resulting in a stack overflow error."
    )
    mock_resp = LLMResponse(
        parsed=mock_result,
        raw_text="",
        model_name="gemini-3.1-flash-lite",
        prompt_tokens=280,
        completion_tokens=35,
        total_tokens=315,
        estimated_cost_usd=0.0001,
        provider_name="gemini",
    )

    with patch("backend.app.services.ask_service.get_llm_provider") as mock_get_provider:
        mock_provider_inst = MagicMock()
        mock_provider_inst.provider_name = "gemini"
        mock_provider_inst.model_name = "gemini-3.1-flash-lite"
        mock_provider_inst.generate_structured = AsyncMock(return_value=mock_resp)
        mock_get_provider.return_value = mock_provider_inst

        res = client.post(
            f"/api/v1/lectures/{lec.id}/ask",
            json={"question": "Recursion mein base condition na ho toh kya hoga?"},
            headers=auth_headers_user1,
        )

        assert res.status_code == 200
        data = res.json()
        assert data["answered"] is True
        assert "stack overflow" in data["answer"].lower()


def test_ask_lecture_owner_only(client: TestClient, setup_lecture_with_notes_and_transcript, auth_headers_user2):
    """Non-owner receives 404 (IDOR prevention)."""
    lec = setup_lecture_with_notes_and_transcript
    res = client.post(
        f"/api/v1/lectures/{lec.id}/ask",
        json={"question": "What is this lecture about?"},
        headers=auth_headers_user2,
    )
    assert res.status_code == 404


def test_ask_lecture_privacy_guard_blocking(client: TestClient, db_session, auth_headers_user1):
    """Non-test data is blocked under LLM_TIER=free."""
    lec_non_test = Lecture(
        id="lec_privacy_ask_blocked",
        user_id="usr_test_ask_1",
        title="Confidential Non-Test Lecture",
        subject="CS",
        is_test_data=False,
    )
    db_session.add(lec_non_test)
    db_session.commit()

    with patch("backend.app.core.config.settings.LLM_TIER", "free"):
        res = client.post(
            f"/api/v1/lectures/{lec_non_test.id}/ask",
            json={"question": "What is covered?"},
            headers=auth_headers_user1,
        )
        assert res.status_code == 403
        assert "PRIVACY_GUARD_BLOCKED" in res.json().get("code", "")


@pytest.mark.asyncio
async def test_ask_lecture_caching(client: TestClient, setup_lecture_with_notes_and_transcript, auth_headers_user1):
    """Repeated question hits the database cache and does not call LLM twice."""
    lec = setup_lecture_with_notes_and_transcript

    mock_result = AskLectureGenerationResult(
        answered=True,
        answer="Cached test answer."
    )
    mock_resp = LLMResponse(
        parsed=mock_result,
        raw_text="",
        model_name="gemini-3.1-flash-lite",
        prompt_tokens=200,
        completion_tokens=20,
        total_tokens=220,
        estimated_cost_usd=0.00005,
        provider_name="gemini",
    )

    with patch("backend.app.services.ask_service.get_llm_provider") as mock_get_provider:
        mock_provider_inst = MagicMock()
        mock_provider_inst.provider_name = "gemini"
        mock_provider_inst.model_name = "gemini-3.1-flash-lite"
        mock_provider_inst.generate_structured = AsyncMock(return_value=mock_resp)
        mock_get_provider.return_value = mock_provider_inst

        # First call
        res1 = client.post(
            f"/api/v1/lectures/{lec.id}/ask",
            json={"question": "What is the caching test question?"},
            headers=auth_headers_user1,
        )
        assert res1.status_code == 200
        assert mock_provider_inst.generate_structured.call_count == 1

        # Second identical call — should be served from cache
        res2 = client.post(
            f"/api/v1/lectures/{lec.id}/ask",
            json={"question": "What is the caching test question?"},
            headers=auth_headers_user1,
        )
        assert res2.status_code == 200
        assert res2.json()["answer"] == "Cached test answer."
        # Call count should STILL be 1
        assert mock_provider_inst.generate_structured.call_count == 1
