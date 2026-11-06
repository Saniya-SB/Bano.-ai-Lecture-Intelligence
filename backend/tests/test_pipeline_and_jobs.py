import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from fastapi.testclient import TestClient

from backend.app.models.entities import Lecture, TranscriptionJob
from backend.app.models.enums import JobStage, LectureStatus
from backend.app.services.gnani_provider import NormalisedTranscript, NormalisedTranscriptSegment
from backend.app.services.pipeline_worker import process_lecture_pipeline
from backend.app.services.job_machine import JobStateMachine


@pytest.mark.asyncio
async def test_complete_lecture_pipeline_flow(db_session, tmp_path):
    # Setup test lecture and job
    user_id = "usr_mock_1"
    lecture_id = "lec_pipe_test_1"
    storage_file = tmp_path / "test_audio.wav"
    # Create fake WAV with RIFF WAVE header and some bytes
    storage_file.write_bytes(b"RIFF\x24\x00\x00\x00WAVEfmt " + b"\x00" * 4000)

    lecture = Lecture(
        id=lecture_id,
        user_id=user_id,
        title="Data Structures Lecture",
        subject="CS",
        status=LectureStatus.UPLOADED.value,
        audio_storage_path=str(storage_file),
    )
    job = TranscriptionJob(
        id="job_pipe_test_1",
        lecture_id=lecture_id,
        stage=JobStage.UPLOADING.value,
    )
    db_session.add(lecture)
    db_session.add(job)
    db_session.commit()

    # Mock provider response
    mock_normalised = NormalisedTranscript(
        lecture_id=lecture_id,
        detected_language="hi-IN",
        full_text_devanagari="आज हम बाइनरी सर्च ट्री सीखेंगे",
        full_text_roman="aaj ham binary search tree seekhenge",
        devanagari_segments=[
            NormalisedTranscriptSegment(
                id="seg_d1",
                start_time=0.0,
                end_time=5.0,
                text="आज हम बाइनरी सर्च ट्री सीखेंगे",
            )
        ],
        roman_segments=[
            NormalisedTranscriptSegment(
                id="seg_r1",
                start_time=0.0,
                end_time=5.0,
                text="aaj ham binary search tree seekhenge",
            )
        ],
        raw_provider_response={"transcript": "आज हम बाइनरी सर्च ट्री सीखेंगे"},
    )

    mock_provider = MagicMock()
    mock_provider.transcribe = AsyncMock(return_value=mock_normalised)

    # Patch SessionLocal inside pipeline_worker to use test db_session
    with patch("backend.app.services.pipeline_worker.SessionLocal", return_value=db_session), \
         patch("backend.app.services.audio_prep.AudioPrepService.probe_media", return_value=(15.0, 16000, 1)):
        
        await process_lecture_pipeline(lecture_id=lecture_id, provider=mock_provider)

    # Re-query job and lecture
    updated_job = db_session.query(TranscriptionJob).filter(TranscriptionJob.id == "job_pipe_test_1").first()
    updated_lecture = db_session.query(Lecture).filter(Lecture.id == "lec_pipe_test_1").first()

    assert updated_job.stage == JobStage.COMPLETED.value
    assert updated_job.progress_percent == 100
    assert updated_lecture.status == LectureStatus.COMPLETED.value
    assert updated_lecture.duration_seconds == 15




def test_get_job_endpoint(client: TestClient, db_session):
    lecture = Lecture(
        id="lec_job_query_1",
        user_id="usr_mock_1",
        title="Query Test",
        subject="AI",
    )
    job = TranscriptionJob(
        id="job_query_1",
        lecture_id=lecture.id,
        stage=JobStage.TRANSCRIBING.value,
        progress_percent=50,
    )
    db_session.add(lecture)
    db_session.add(job)
    db_session.commit()

    # Query by job id
    resp_by_job = client.get(f"/api/v1/jobs/{job.id}", headers={"Authorization": "Bearer mock"})
    assert resp_by_job.status_code == 200
    assert resp_by_job.json()["id"] == job.id
    assert resp_by_job.json()["stage"] == JobStage.TRANSCRIBING.value

    # Query by lecture id (frontend convention)
    resp_by_lec = client.get(f"/api/v1/jobs/{lecture.id}", headers={"Authorization": "Bearer mock"})
    assert resp_by_lec.status_code == 200
    assert resp_by_lec.json()["lecture_id"] == lecture.id


def test_startup_recover_stuck_jobs(db_session):
    lecture = Lecture(
        id="lec_stuck_test",
        user_id="usr_mock_1",
        title="Stuck Lecture",
        subject="Math",
    )
    job1 = TranscriptionJob(
        id="job_stuck_retryable",
        lecture_id=lecture.id,
        stage=JobStage.PREPARING_AUDIO.value,
        retry_count=1,
    )
    db_session.add(lecture)
    db_session.add(job1)
    db_session.commit()

    recovered = JobStateMachine.recover_stuck_jobs(db_session)
    assert recovered == 1
    db_session.refresh(job1)
    assert job1.retry_count == 2
    assert "scheduled for resumption" in job1.error_message

    # Test exceeding max retries
    job1.retry_count = 3
    db_session.add(job1)
    db_session.commit()

    JobStateMachine.recover_stuck_jobs(db_session)
    db_session.refresh(job1)
    assert job1.stage == JobStage.FAILED.value
    assert job1.error_code == "STARTUP_RECOVERY_EXCEEDED_RETRIES"
