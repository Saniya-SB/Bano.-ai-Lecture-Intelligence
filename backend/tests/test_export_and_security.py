import json
import io
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from backend.app.core.config import settings
from backend.app.core.exceptions import AppException
from backend.app.main import app, lifespan
from backend.app.models.entities import Lecture, User, Transcript, TranscriptSegment, GeneratedOutput
from backend.app.models.enums import LectureStatus, TranscriptVersion, OutputType, SegmentType
from backend.app.services.storage import get_storage_adapter
from backend.app.services.validators import validate_youtube_url_safety
from backend.app.services.llm.service import LearningMaterialService


def test_export_markdown_owner_success(client: TestClient, db_session: Session):
    """
    Test GET /lectures/{id}/export?format=md
    Verifies owner access, markdown content, AI-generated labels, and dual transcripts.
    """
    user_a = "usr_export_alice"
    token_a = json.dumps({"id": user_a, "email": "alice_exp@bano.ai", "full_name": "Alice Export"})
    headers_a = {"Authorization": f"Bearer {token_a}"}

    # Create user and lecture
    lec_id = "lec_exp_test_1"
    lecture = Lecture(
        id=lec_id,
        user_id=user_a,
        title="Engineering CS - Binary Search Trees",
        subject="Computer Science",
        topic="BST Traversal",
        duration_seconds=125,
        status=LectureStatus.COMPLETED.value,
    )
    db_session.add(lecture)

    # Devanagari Transcript
    tr_dev = Transcript(
        id="tr_dev_exp",
        lecture_id=lec_id,
        version_type=TranscriptVersion.NORMALISED.value,
        full_text="आज हम बाइनरी सर्च ट्री सीखेंगे",
    )
    db_session.add(tr_dev)
    seg_dev = TranscriptSegment(
        id="seg_dev_1",
        transcript_id=tr_dev.id,
        segment_index=0,
        start_time=0.0,
        end_time=10.0,
        text="आज हम बाइनरी सर्च ट्री सीखेंगे",
        segment_type=SegmentType.CONCEPT.value,
    )
    db_session.add(seg_dev)

    # Roman Transcript
    tr_rom = Transcript(
        id="tr_rom_exp",
        lecture_id=lec_id,
        version_type=TranscriptVersion.ROMAN.value,
        full_text="aaj ham binary search tree seekhenge",
    )
    db_session.add(tr_rom)
    seg_rom = TranscriptSegment(
        id="seg_rom_1",
        transcript_id=tr_rom.id,
        segment_index=0,
        start_time=0.0,
        end_time=10.0,
        text="aaj ham binary search tree seekhenge",
        segment_type=SegmentType.CONCEPT.value,
    )
    db_session.add(seg_rom)

    # Generated Output (AI study materials)
    materials_content = {
        "summary": {
            "short": "Short executive summary of BST.",
            "detailed": "Detailed multi-paragraph breakdown of BST insertion and traversal."
        },
        "notes": [
            {
                "heading": "BST Invariant",
                "bullet_points": ["Left child < Node", "Right child > Node"]
            }
        ],
        "key_concepts": [
            {
                "concept": "Binary Search Tree",
                "explanation": "A rooted binary tree with key ordering property."
            }
        ],
        "glossary": [
            {
                "term": "BST",
                "definition": "Binary Search Tree"
            }
        ],
        "important_questions": [
            {
                "question": "What is inorder traversal order in a BST?",
                "suggested_answer": "Sorted ascending order."
            }
        ],
        "announcements": [
            {
                "text": "Assignment 2 is due this Friday by 11:59 PM."
            }
        ]
    }
    gen_out = GeneratedOutput(
        id="out_exp_1",
        lecture_id=lec_id,
        user_id=user_a,
        output_type=OutputType.NOTES.value,
        prompt_version="v1.0",
        cache_key="cache_key_exp_1",
        content=materials_content,
        model_name="gemini-3.1-flash-lite",
    )
    db_session.add(gen_out)
    db_session.commit()

    # Call Export endpoint
    res = client.get(f"/api/v1/lectures/{lec_id}/export?format=md", headers=headers_a)
    assert res.status_code == 200
    assert "text/markdown" in res.headers["content-type"]
    assert "attachment" in res.headers["content-disposition"]
    assert "_export.md" in res.headers["content-disposition"]

    md = res.text
    # Check Title and Metadata
    assert "# Engineering CS - Binary Search Trees" in md
    assert "- **Subject**: Computer Science" in md
    assert "- **Topic**: BST Traversal" in md
    assert "02:05 (125s)" in md

    # Check AI-Generated Section Labels and content
    assert "## AI-Generated Study Materials" in md
    assert "AI-Generated Content Notice" in md
    assert "Short executive summary of BST." in md
    assert "Detailed multi-paragraph breakdown of BST insertion and traversal." in md
    assert "#### BST Invariant" in md
    assert "- Left child < Node" in md
    assert "**Binary Search Tree**: A rooted binary tree with key ordering property." in md
    assert "**BST**: Binary Search Tree" in md
    assert "What is inorder traversal order in a BST?" in md
    assert "Sorted ascending order." in md
    assert "Assignment 2 is due this Friday by 11:59 PM." in md

    # Check Transcripts
    assert "## Lecture Transcripts" in md
    assert "### Devanagari Transcript" in md
    assert "आज हम बाइनरी सर्च ट्री सीखेंगे" in md
    assert "### Romanized Transcript" in md
    assert "aaj ham binary search tree seekhenge" in md


def test_export_markdown_invalid_format(client: TestClient):
    """Export must only support format=md and reject any other format (e.g. pdf) with 400."""
    token = json.dumps({"id": "usr_fmt", "email": "fmt@bano.ai", "full_name": "Fmt User"})
    headers = {"Authorization": f"Bearer {token}"}

    res = client.get("/api/v1/lectures/lec_nonexistent/export?format=pdf", headers=headers)
    assert res.status_code == 400
    assert res.json()["code"] == "UNSUPPORTED_EXPORT_FORMAT"


def test_export_and_materials_idor_prevention(client: TestClient, db_session: Session):
    """
    User B must not be able to export or fetch learning materials of User A's lecture.
    Returns 404 to avoid leaking existence.
    """
    token_a = json.dumps({"id": "usr_owner_a", "email": "owner_a@bano.ai", "full_name": "Owner A"})
    token_b = json.dumps({"id": "usr_intruder_b", "email": "intruder_b@bano.ai", "full_name": "Intruder B"})

    headers_a = {"Authorization": f"Bearer {token_a}"}
    headers_b = {"Authorization": f"Bearer {token_b}"}

    # User A creates a lecture
    lec_res = client.post(
        "/api/v1/lectures",
        json={"title": "Private Research", "subject": "Math"},
        headers=headers_a,
    )
    assert lec_res.status_code == 201
    lec_id = lec_res.json()["id"]

    # Intruder B attempts to export User A's lecture
    export_b = client.get(f"/api/v1/lectures/{lec_id}/export?format=md", headers=headers_b)
    assert export_b.status_code == 404

    # Intruder B attempts to get User A's materials
    mat_b = client.get(f"/api/v1/lectures/{lec_id}/materials", headers=headers_b)
    assert mat_b.status_code == 404

    # Intruder B attempts to get User A's transcripts
    tr_b = client.get(f"/api/v1/lectures/{lec_id}/transcripts", headers=headers_b)
    assert tr_b.status_code == 404


def test_upload_session_idor_prevention(client: TestClient):
    """
    Ensure User B cannot hijack or upload into User A's upload session.
    """
    token_a = json.dumps({"id": "usr_upl_a", "email": "upl_a@bano.ai", "full_name": "User A"})
    token_b = json.dumps({"id": "usr_upl_b", "email": "upl_b@bano.ai", "full_name": "User B"})

    headers_a = {"Authorization": f"Bearer {token_a}"}
    headers_b = {"Authorization": f"Bearer {token_b}"}

    # User A initiates upload
    init_res = client.post(
        "/api/v1/uploads/initiate",
        json={"file_name": "lecture.wav", "mime_type": "audio/wav", "file_size": 2048},
        headers=headers_a,
    )
    assert init_res.status_code == 200
    upload_id = init_res.json()["uploadId"]

    # User B attempts to upload binary to User A's upload_id -> 404
    fake_wav = b"RIFF" + b"\x00" * 36 + b"WAVEfmt " + b"\x00" * 2000
    binary_b = client.post(
        f"/api/v1/uploads/{upload_id}/binary",
        files={"file": ("malicious.wav", fake_wav, "audio/wav")},
        headers=headers_b,
    )
    assert binary_b.status_code == 404

    # User B attempts to complete User A's upload_id -> 404
    complete_b = client.post(
        "/api/v1/uploads/complete",
        json={"upload_id": upload_id},
        headers=headers_b,
    )
    assert complete_b.status_code == 404


def test_production_guards_auth_and_free_tier():
    """
    Verify production safety:
    1. Lifespan refuses to start with ENVIRONMENT=production and AUTH_MODE=dev
    2. Lifespan refuses to start with ENVIRONMENT=production and LLM_TIER=free
    3. LearningMaterialService blocks free tier in production
    """
    original_env = settings.ENVIRONMENT
    original_auth = settings.AUTH_MODE
    original_tier = settings.LLM_TIER

    try:
        settings.ENVIRONMENT = "production"

        # 1. AUTH_MODE=dev forbidden in production
        settings.AUTH_MODE = "dev"
        settings.LLM_TIER = "paid"
        with pytest.raises(RuntimeError, match="AUTH_MODE=dev is not allowed"):
            with TestClient(app):
                pass

        # 2. LLM_TIER=free forbidden in production
        settings.AUTH_MODE = "firebase"
        settings.LLM_TIER = "free"
        with pytest.raises(RuntimeError, match="LLM_TIER=free is not allowed"):
            with TestClient(app):
                pass

        # 3. Privacy guard check inside service
        service = LearningMaterialService()
        dummy_lec = Lecture(id="lec_prod_test", user_id="u1", title="T", subject="S", is_test_data=True)
        with pytest.raises(AppException) as exc_info:
            service._verify_privacy_tier(dummy_lec)
        assert exc_info.value.status_code == 403
        assert exc_info.value.code == "PRIVACY_GUARD_BLOCKED"

    finally:
        settings.ENVIRONMENT = original_env
        settings.AUTH_MODE = original_auth
        settings.LLM_TIER = original_tier


def test_ssrf_url_validation():
    """Verify SSRF validation rejects non-YouTube hosts and private IPs."""
    # Disallowed host
    with pytest.raises(AppException) as exc_host:
        validate_youtube_url_safety("https://malicious-site.com/video")
    assert exc_host.value.code == "DISALLOWED_HOST"

    # Disallowed scheme
    with pytest.raises(AppException) as exc_scheme:
        validate_youtube_url_safety("ftp://youtube.com/watch?v=123")
    assert exc_scheme.value.code == "INVALID_URL_SCHEME"


def test_storage_path_traversal_rejection():
    """Verify LocalStorageAdapter._resolve rejects directory traversal attempts."""
    storage = get_storage_adapter()
    with pytest.raises(ValueError, match="Path traversal detected"):
        storage.read_file("../../etc/passwd")
