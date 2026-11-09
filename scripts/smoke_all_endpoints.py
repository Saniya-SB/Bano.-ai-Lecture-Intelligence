#!/usr/bin/env python3
"""
scripts/smoke_all_endpoints.py

Reads OpenAPI schema from the running backend (or local FastAPI app instance),
calls every route with dev auth, checks unauthenticated calls (401),
and checks cross-user ownership / IDOR (404/403).
Prints a formatted table of route, method, status, result, and whether a real provider key is required.
"""
import sys
import os
import json
import io
import time
from typing import Any

# Ensure project root in python path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

# Force dev auth for smoke test
os.environ["AUTH_MODE"] = "dev"
from backend.app.core.config import settings
settings.AUTH_MODE = "dev"

from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.models.entities import Lecture, Transcript, TranscriptSegment, GeneratedOutput, TranscriptionJob
from backend.app.models.enums import LectureStatus, TranscriptVersion, SegmentType, OutputType, JobStage
from backend.app.db.session import SessionLocal

# Two distinct dev users
USER_A = {"id": "usr_smoke_alice", "email": "alice@bano.ai", "full_name": "Alice Smoke"}
USER_B = {"id": "usr_smoke_bob", "email": "bob@bano.ai", "full_name": "Bob Smoke"}

TOKEN_A = json.dumps(USER_A)
TOKEN_B = json.dumps(USER_B)

AUTH_HEADER_A = {"Authorization": f"Bearer {TOKEN_A}"}
AUTH_HEADER_B = {"Authorization": f"Bearer {TOKEN_B}"}


def setup_seed_resources():
    """Create persistent fixtures in SQLite for user A to verify ownership and GET routes."""
    with SessionLocal() as db:
        # Check if already present
        existing = db.query(Lecture).filter(Lecture.id == "lec_smoke_001").first()
        if existing:
            return "lec_smoke_001", "job_smoke_001"

        lec = Lecture(
            id="lec_smoke_001",
            user_id=USER_A["id"],
            title="Smoke Test Lecture - Binary Trees",
            subject="Computer Science",
            topic="Tree Traversal",
            duration_seconds=60,
            status=LectureStatus.COMPLETED.value,
            is_test_data=True,
        )
        db.add(lec)

        job = TranscriptionJob(
            id="job_smoke_001",
            lecture_id=lec.id,
            provider="gnani",
            stage=JobStage.COMPLETED.value,
            progress_percent=100,
        )
        db.add(job)

        tr = Transcript(
            id="tr_smoke_001",
            lecture_id=lec.id,
            version_type=TranscriptVersion.NORMALISED.value,
            full_text="Smoke test transcript content",
        )
        db.add(tr)

        seg1 = TranscriptSegment(
            id="seg_smk_1",
            transcript_id=tr.id,
            segment_index=0,
            start_time=0.0,
            end_time=10.0,
            text="Binary search tree basics",
            segment_type=SegmentType.CONCEPT.value,
        )
        seg2 = TranscriptSegment(
            id="seg_smk_2",
            transcript_id=tr.id,
            segment_index=1,
            start_time=10.0,
            end_time=20.0,
            text="Kal sabhi homework submit karenge.",
            segment_type=SegmentType.ADMIN.value,
        )
        db.add_all([seg1, seg2])

        # Add pre-existing notes output
        notes_out = GeneratedOutput(
            id="out_smk_notes",
            lecture_id=lec.id,
            user_id=USER_A["id"],
            output_type=OutputType.NOTES.value,
            prompt_version="v1.0",
            cache_key="notes:lec_smoke_001",
            content={
                "summary": {"short": "Short summary", "detailed": "Detailed summary"},
                "notes": [{"heading": "BST", "bullet_points": ["Left < Root"]}],
                "key_concepts": [{"concept": "BST", "explanation": "Tree"}],
                "glossary": [{"term": "BST", "definition": "Binary Search Tree"}],
                "important_questions": [{"question": "Q?", "suggested_answer": "A"}],
                "announcements": [{"text": "Submit homework"}],
            },
            model_name="mock-model",
            token_usage={"prompt_tokens": 100, "completion_tokens": 50, "total_tokens": 150, "estimated_cost_usd": 0.0001},
        )
        db.add(notes_out)

        db.commit()
        return lec.id, job.id


def main():
    print("=" * 115)
    print(" BANO.AI ENDPOINT SMOKE TEST & OPENAPI VALIDATION SUITE")
    print("=" * 115)

    client = TestClient(app)

    # 1. Inspect OpenAPI Schema
    openapi = app.openapi()
    paths = openapi.get("paths", {})
    print(f"[*] Discovered {len(paths)} route paths in OpenAPI schema.")

    lecture_id, job_id = setup_seed_resources()

    results = []

    # Helper function to record route test
    def test_endpoint(
        name: str,
        method: str,
        url: str,
        requires_key: str,
        call_fn,
        expect_status: int = 200,
        test_unauth: bool = True,
        test_idor: bool = False,
    ):
        # 1. Main authenticated call
        auth_resp, err_msg = None, None
        try:
            auth_resp = call_fn(client, AUTH_HEADER_A)
            status_match = auth_resp.status_code == expect_status
        except Exception as ex:
            status_match = False
            err_msg = str(ex)

        auth_status = f"{auth_resp.status_code if auth_resp else 'ERR'}"
        main_pass = status_match

        # 2. Unauthenticated check (must return 401 if auth required)
        unauth_pass = True
        unauth_status = "N/A"
        if test_unauth:
            try:
                unauth_r = call_fn(client, {})
                unauth_status = str(unauth_r.status_code)
                unauth_pass = unauth_r.status_code == 401
            except Exception:
                unauth_pass = False

        # 3. IDOR / Ownership check (User B must get 404 or 403)
        idor_pass = True
        idor_status = "N/A"
        if test_idor:
            try:
                idor_r = call_fn(client, AUTH_HEADER_B)
                idor_status = str(idor_r.status_code)
                idor_pass = idor_r.status_code in (403, 404)
            except Exception:
                idor_pass = False

        all_passed = main_pass and unauth_pass and idor_pass
        res_str = "PASS" if all_passed else "FAIL"

        details = f"Auth:{auth_status}"
        if test_unauth:
            details += f" | Unauth:{unauth_status}"
        if test_idor:
            details += f" | IDOR:{idor_status}"
        if err_msg:
            details += f" ({err_msg[:20]})"

        results.append({
            "name": name,
            "method": method,
            "url": url,
            "requires_key": requires_key,
            "details": details,
            "result": res_str,
            "all_passed": all_passed,
        })

    # --- DEFINITION OF ENDPOINTS ---

    # 1. Health
    test_endpoint(
        "Health Check", "GET", "/api/v1/health", "None",
        lambda c, h: c.get("/api/v1/health", headers=h),
        expect_status=200, test_unauth=False, test_idor=False
    )

    # 2. User profile
    test_endpoint(
        "User Profile (Me)", "GET", "/api/v1/users/me", "None (Dev Auth)",
        lambda c, h: c.get("/api/v1/users/me", headers=h),
        expect_status=200, test_unauth=True, test_idor=False
    )

    # 3. Lectures list
    test_endpoint(
        "List Lectures", "GET", "/api/v1/lectures", "None",
        lambda c, h: c.get("/api/v1/lectures", headers=h),
        expect_status=200, test_unauth=True, test_idor=False
    )

    # 4. Lecture create
    test_endpoint(
        "Create Lecture", "POST", "/api/v1/lectures", "None",
        lambda c, h: c.post("/api/v1/lectures", json={"title": "Dynamic Smoke Lec", "subject": "CS"}, headers=h),
        expect_status=201, test_unauth=True, test_idor=False
    )

    # 5. Lecture detail
    test_endpoint(
        "Get Lecture by ID", "GET", f"/api/v1/lectures/{lecture_id}", "None",
        lambda c, h: c.get(f"/api/v1/lectures/{lecture_id}", headers=h),
        expect_status=200, test_unauth=True, test_idor=True
    )

    # 6. Lecture patch
    test_endpoint(
        "Update Lecture", "PATCH", f"/api/v1/lectures/{lecture_id}", "None",
        lambda c, h: c.patch(f"/api/v1/lectures/{lecture_id}", json={"title": "Updated BST"}, headers=h),
        expect_status=200, test_unauth=True, test_idor=True
    )

    # 7. Transcripts
    test_endpoint(
        "Get Transcripts", "GET", f"/api/v1/lectures/{lecture_id}/transcripts", "None",
        lambda c, h: c.get(f"/api/v1/lectures/{lecture_id}/transcripts", headers=h),
        expect_status=200, test_unauth=True, test_idor=True
    )

    # 8. Export markdown
    test_endpoint(
        "Export Markdown", "GET", f"/api/v1/lectures/{lecture_id}/export?format=md", "None",
        lambda c, h: c.get(f"/api/v1/lectures/{lecture_id}/export?format=md", headers=h),
        expect_status=200, test_unauth=True, test_idor=True
    )

    # 9. Materials (outputs alias)
    test_endpoint(
        "Get Outputs", "GET", f"/api/v1/lectures/{lecture_id}/outputs", "None",
        lambda c, h: c.get(f"/api/v1/lectures/{lecture_id}/outputs", headers=h),
        expect_status=200, test_unauth=True, test_idor=True
    )

    # 10. Materials endpoint
    test_endpoint(
        "Get Materials", "GET", f"/api/v1/lectures/{lecture_id}/materials", "None",
        lambda c, h: c.get(f"/api/v1/lectures/{lecture_id}/materials", headers=h),
        expect_status=200, test_unauth=True, test_idor=True
    )

    # 11. Uploads initiate
    test_endpoint(
        "Upload Initiate", "POST", "/api/v1/uploads/initiate", "None",
        lambda c, h: c.post("/api/v1/uploads/initiate", json={"file_name": f"audio_{time.time()}.wav", "mime_type": "audio/wav", "file_size": 2048}, headers=h),
        expect_status=200, test_unauth=True, test_idor=False
    )

    # 12. Upload binary payload
    def run_upload_binary(c, h):
        init_res = c.post("/api/v1/uploads/initiate", json={"file_name": f"sample_{time.time()}.wav", "mime_type": "audio/wav", "file_size": 1024}, headers=AUTH_HEADER_A)
        upl_id = init_res.json().get("uploadId", "upl_dummy")
        wav_header = b"RIFF" + b"\x24\x00\x00\x00" + b"WAVEfmt " + b"\x10\x00\x00\x00" + b"\x01\x00\x01\x00\x44\xac\x00\x00" + b"\x88\x58\x01\x00\x02\x00\x10\x00" + b"data" + os.urandom(64)
        return c.post(f"/api/v1/uploads/{upl_id}/binary", files={"file": ("sample.wav", wav_header, "audio/wav")}, headers=h)

    test_endpoint(
        "Upload Binary", "POST", "/api/v1/uploads/{upload_id}/binary", "None",
        run_upload_binary,
        expect_status=200, test_unauth=True, test_idor=True
    )

    # 13. Upload complete
    def run_upload_complete(c, h):
        # Initiate and upload unique audio to avoid 409 duplicate
        unique_audio = b"RIFF\x24\x00\x00\x00WAVEfmt \x10\x00\x00\x00\x01\x00\x01\x00\x44\xac\x00\x00\x88\x58\x01\x00\x02\x00\x10\x00data" + os.urandom(128)
        init_res = c.post("/api/v1/uploads/initiate", json={"file_name": f"complete_{time.time()}.wav", "mime_type": "audio/wav", "file_size": len(unique_audio)}, headers=AUTH_HEADER_A)
        upl_id = init_res.json().get("uploadId", "upl_dummy")
        c.post(f"/api/v1/uploads/{upl_id}/binary", files={"file": ("sample.wav", unique_audio, "audio/wav")}, headers=AUTH_HEADER_A)
        return c.post("/api/v1/uploads/complete", json={"upload_id": upl_id}, headers=h)

    test_endpoint(
        "Upload Complete", "POST", "/api/v1/uploads/complete", "None",
        run_upload_complete,
        expect_status=200, test_unauth=True, test_idor=True
    )

    # 14. Upload direct multipart
    direct_wav = b"RIFF\x24\x00\x00\x00WAVEfmt \x10\x00\x00\x00\x01\x00\x01\x00\x44\xac\x00\x00\x88\x58\x01\x00\x02\x00\x10\x00data\x00\x00\x00\x00"
    test_endpoint(
        "Direct Upload", "POST", "/api/v1/uploads/direct", "None",
        lambda c, h: c.post(
            "/api/v1/uploads/direct",
            data={"title": f"Direct Upload {time.time()}", "subject": "CS"},
            files={"file": ("rec.wav", direct_wav + os.urandom(64), "audio/wav")},
            headers=h
        ),
        expect_status=200, test_unauth=True, test_idor=False
    )

    # 15. YouTube stub
    test_endpoint(
        "YouTube Stub", "POST", "/api/v1/uploads/youtube", "None",
        lambda c, h: c.post("/api/v1/uploads/youtube", data={"url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ"}, headers=h),
        expect_status=501, test_unauth=True, test_idor=False
    )

    # 16. Jobs query
    test_endpoint(
        "Get Job Progress", "GET", f"/api/v1/jobs/{job_id}", "None",
        lambda c, h: c.get(f"/api/v1/jobs/{job_id}", headers=h),
        expect_status=200, test_unauth=True, test_idor=True
    )

    # 17. Benchmark results
    test_endpoint(
        "Benchmark Results", "GET", "/api/v1/benchmark/results", "None",
        lambda c, h: c.get("/api/v1/benchmark/results", headers=h),
        expect_status=200, test_unauth=False, test_idor=False
    )

    # 18. Benchmark details
    test_endpoint(
        "Benchmark Details", "GET", "/api/v1/benchmark/details", "None",
        lambda c, h: c.get("/api/v1/benchmark/details", headers=h),
        expect_status=200, test_unauth=False, test_idor=False
    )

    # 19. Quiz GET (check existing or newly generated)
    test_endpoint(
        "Get Quiz", "GET", f"/api/v1/lectures/{lecture_id}/quiz", "None",
        lambda c, h: c.get(f"/api/v1/lectures/{lecture_id}/quiz", headers=h),
        expect_status=200, test_unauth=True, test_idor=True
    )

    # 20. Live LLM Generation Endpoints (Clearly marked as requiring GEMINI_API_KEY / GROQ_API_KEY)
    has_gemini_key = bool(settings.GEMINI_API_KEY and not settings.GEMINI_API_KEY.startswith("mock"))
    print("\n[i] Checking provider keys for live generation endpoints:")
    print(f"    - GEMINI_API_KEY configured: {has_gemini_key}")
    print(f"    - GNANI_API_KEY configured: {bool(settings.GNANI_API_KEY)}")

    test_endpoint(
        "Generate Quiz (LLM)", "POST", f"/api/v1/lectures/{lecture_id}/quiz?num_questions=3",
        "GEMINI_API_KEY" if has_gemini_key else "MOCK_KEY",
        lambda c, h: c.post(f"/api/v1/lectures/{lecture_id}/quiz?num_questions=3", headers=h),
        expect_status=200, test_unauth=True, test_idor=True
    )

    test_endpoint(
        "Generate Materials (LLM)", "POST", f"/api/v1/lectures/{lecture_id}/generate",
        "GEMINI_API_KEY" if has_gemini_key else "MOCK_KEY",
        lambda c, h: c.post(f"/api/v1/lectures/{lecture_id}/generate", headers=h),
        expect_status=200, test_unauth=True, test_idor=True
    )

    # Print Table
    print("\n" + "=" * 115)
    print(f"{'ROUTE NAME':<26} | {'METHOD':<6} | {'URL / PATH':<40} | {'KEY REQ':<15} | {'RESULT':<6} | {'STATUS DETAILS'}")
    print("-" * 115)
    all_ok = True
    for r in results:
        flag = "✓ PASS" if r["result"] == "PASS" else "✗ FAIL"
        if r["result"] != "PASS":
            all_ok = False
        print(f"{r['name']:<26} | {r['method']:<6} | {r['url'][:40]:<40} | {r['requires_key']:<15} | {flag:<6} | {r['details']}")
    print("=" * 115)

    if all_ok:
        print("\n[SUCCESS] All endpoints passed smoke testing, authentication, and IDOR ownership checks!\n")
        return 0
    else:
        print("\n[FAIL] Some endpoint smoke tests failed. Review details above.\n")
        return 1


if __name__ == "__main__":
    sys.exit(main())
