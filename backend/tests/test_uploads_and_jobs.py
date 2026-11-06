import io
import pytest
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient

from backend.app.models.entities import Lecture, TranscriptionJob
from backend.app.models.enums import JobStage, LectureStatus
from backend.app.services.validators import (
    validate_magic_bytes,
    validate_file_metadata,
    validate_youtube_url_safety,
    compute_sha256,
)
from backend.app.core.exceptions import AppException
from backend.app.services.audio_prep import AudioPrepService
from backend.app.services.job_machine import JobStateMachine


def test_magic_byte_validation():
    # Valid WAV
    wav_header = b"RIFF\x24\x00\x00\x00WAVEfmt "
    valid, fmt = validate_magic_bytes(wav_header)
    assert valid is True
    assert fmt == "wav"

    # Valid MP3 ID3
    mp3_header = b"ID3\x03\x00\x00\x00\x00\x00\x00"
    valid, fmt = validate_magic_bytes(mp3_header)
    assert valid is True
    assert fmt == "mp3"

    # Valid MP4 / M4A (ftyp at byte 4)
    mp4_header = b"\x00\x00\x00\x20ftypmp42"
    valid, fmt = validate_magic_bytes(mp4_header)
    assert valid is True
    assert fmt == "mp4"

    # Invalid random bytes
    invalid_header = b"NOT_A_VALID_AUDIO_FILE_DATA"
    valid, fmt = validate_magic_bytes(invalid_header)
    assert valid is False
    assert fmt == "unknown"


def test_file_metadata_validation():
    # Negative / zero size
    with pytest.raises(AppException) as exc:
        validate_file_metadata(0)
    assert exc.value.code == "EMPTY_FILE"

    # Exceeding size
    with pytest.raises(AppException) as exc:
        validate_file_metadata(600 * 1024 * 1024)
    assert exc.value.code == "FILE_TOO_LARGE"


def test_youtube_url_ssrf_safety_and_stub(client: TestClient):
    # SSRF: loopback / internal private IP rejected
    with pytest.raises(AppException) as exc:
        validate_youtube_url_safety("http://localhost:8080/exploit")
    assert exc.value.code == "DISALLOWED_HOST"

    with pytest.raises(AppException) as exc:
        validate_youtube_url_safety("http://169.254.169.254/latest/meta-data/")
    assert exc.value.code == "DISALLOWED_HOST"

    # Authorized YouTube host syntax check
    safe_url = validate_youtube_url_safety("https://www.youtube.com/watch?v=dQw4w9WgXcQ")
    assert "youtube.com" in safe_url

    # YouTube endpoint returns 501 stub
    resp = client.post(
        "/api/v1/uploads/youtube",
        data={"url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ"},
        headers={"Authorization": "Bearer mock"},
    )
    assert resp.status_code == 501
    assert "arbitrary audio/video stream downloading is not supported yet" in resp.json()["detail"]


def test_upload_initiate_and_complete_flow(client: TestClient):
    # 1. Initiate upload
    init_resp = client.post(
        "/api/v1/uploads/initiate",
        json={"file_name": "lecture_ds.wav", "mime_type": "audio/wav", "file_size": 1024},
        headers={"Authorization": "Bearer mock"},
    )
    assert init_resp.status_code == 200
    init_data = init_resp.json()
    upload_id = init_data["uploadId"]
    assert upload_id.startswith("upl_")

    # 2. Upload binary WAV data
    wav_content = b"RIFF$\x00\x00\x00WAVEfmt " + b"\x00" * 100
    upload_resp = client.post(
        f"/api/v1/uploads/{upload_id}/binary",
        files={"file": ("lecture_ds.wav", wav_content, "audio/wav")},
        headers={"Authorization": "Bearer mock"},
    )
    assert upload_resp.status_code == 200
    assert upload_resp.json()["uploaded"] is True

    # 3. Complete upload
    comp_resp = client.post(
        "/api/v1/uploads/complete",
        json={"upload_id": upload_id},
        headers={"Authorization": "Bearer mock"},
    )
    assert comp_resp.status_code == 200
    comp_data = comp_resp.json()
    assert comp_data["success"] is True
    assert comp_data["lecture_id"] is not None
    assert comp_data["job_id"] is not None

    # Verify duplicate detection with same file bytes
    init2 = client.post(
        "/api/v1/uploads/initiate",
        json={"file_name": "lecture_ds_duplicate.wav", "mime_type": "audio/wav", "file_size": 1024},
        headers={"Authorization": "Bearer mock"},
    )
    upl2_id = init2.json()["uploadId"]
    client.post(
        f"/api/v1/uploads/{upl2_id}/binary",
        files={"file": ("lecture_ds_duplicate.wav", wav_content, "audio/wav")},
        headers={"Authorization": "Bearer mock"},
    )
    dup_resp = client.post(
        "/api/v1/uploads/complete",
        json={"upload_id": upl2_id},
        headers={"Authorization": "Bearer mock"},
    )
    assert dup_resp.status_code == 409
    assert dup_resp.json()["detail"].startswith("A lecture with identical audio content already exists")


def test_job_state_machine_transitions(db_session):
    lecture = Lecture(
        id="lec_statemachine_test",
        user_id="usr_mock_1",
        title="State Machine Test",
        subject="Computer Science",
    )
    job = TranscriptionJob(
        id="job_statemachine_test",
        lecture_id=lecture.id,
        stage=JobStage.UPLOADING.value,
        progress_percent=0,
    )
    db_session.add(lecture)
    db_session.add(job)
    db_session.commit()

    # Valid transition: UPLOADING -> VALIDATING
    JobStateMachine.transition(db_session, job, JobStage.VALIDATING, progress_percent=10)
    assert job.stage == JobStage.VALIDATING.value
    assert job.progress_percent == 10
    assert lecture.status == LectureStatus.PROCESSING.value

    # Invalid illegal skip: VALIDATING -> COMPLETED directly
    with pytest.raises(AppException) as exc:
        JobStateMachine.transition(db_session, job, JobStage.COMPLETED)
    assert exc.value.code == "INVALID_STATE_TRANSITION"

    # Transition: VALIDATING -> PREPARING_AUDIO -> TRANSCRIBING -> FAILED
    JobStateMachine.transition(db_session, job, JobStage.PREPARING_AUDIO, progress_percent=25)
    JobStateMachine.transition(db_session, job, JobStage.TRANSCRIBING, progress_percent=50)
    assert lecture.status == LectureStatus.TRANSCRIBING.value

    JobStateMachine.handle_failure(db_session, job, error_message="STT provider unavailable")
    assert job.stage == JobStage.FAILED.value
    assert job.error_message == "STT provider unavailable"
    assert lecture.status == LectureStatus.FAILED.value

