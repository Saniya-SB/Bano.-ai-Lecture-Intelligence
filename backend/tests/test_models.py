from backend.app.models import (
    User, Lecture, TranscriptionJob, Transcript, TranscriptSegment,
    GeneratedOutput, ReferenceTranscript, BenchmarkRun,
    JobStage, can_transition_job_stage, ALLOWED_JOB_STAGE_TRANSITIONS
)


def test_job_stage_state_machine():
    # Valid transitions
    assert can_transition_job_stage(JobStage.UPLOADING, JobStage.VALIDATING)
    assert can_transition_job_stage(JobStage.VALIDATING, JobStage.PREPARING_AUDIO)
    assert can_transition_job_stage(JobStage.PREPARING_AUDIO, JobStage.TRANSCRIBING)
    assert can_transition_job_stage(JobStage.TRANSCRIBING, JobStage.PROCESSING_TRANSCRIPT)
    assert can_transition_job_stage(JobStage.PROCESSING_TRANSCRIPT, JobStage.GENERATING_LEARNING_MATERIAL)
    assert can_transition_job_stage(JobStage.GENERATING_LEARNING_MATERIAL, JobStage.COMPLETED)
    
    # Cancellation & Failure allowed from active stages
    assert can_transition_job_stage(JobStage.TRANSCRIBING, JobStage.FAILED)
    assert can_transition_job_stage(JobStage.TRANSCRIBING, JobStage.CANCELLED)

    # Invalid transitions
    assert not can_transition_job_stage(JobStage.COMPLETED, JobStage.TRANSCRIBING)
    assert not can_transition_job_stage(JobStage.FAILED, JobStage.COMPLETED)
    assert not can_transition_job_stage(JobStage.CANCELLED, JobStage.COMPLETED)
    assert not can_transition_job_stage(JobStage.UPLOADING, JobStage.COMPLETED)


def test_models_crud(db_session):
    # 1. Create User
    user = User(id="usr_test_1", email="test@bano.ai", full_name="Test Student")
    db_session.add(user)
    db_session.flush()

    # 2. Create Lecture
    lecture = Lecture(
        id="lec_test_1",
        user_id=user.id,
        title="Test Lecture on Graph Algorithms",
        subject="Computer Science",
        sha256="abc123hash",
        source_type="upload"
    )
    db_session.add(lecture)
    db_session.flush()

    # 3. Create Transcription Job
    job = TranscriptionJob(
        id="job_test_1",
        lecture_id=lecture.id,
        stage=JobStage.PREPARING_AUDIO.value,
        progress_percent=25
    )
    db_session.add(job)
    db_session.flush()

    # 4. Create Transcript & Segment
    transcript = Transcript(
        id="tr_test_1",
        lecture_id=lecture.id,
        version_type="raw",
        full_text="आज हम DFS और BFS एल्गोरिदम समझेंगे।"
    )
    db_session.add(transcript)
    db_session.flush()

    segment = TranscriptSegment(
        id="seg_test_1",
        transcript_id=transcript.id,
        segment_index=0,
        start_time=0.0,
        end_time=5.5,
        text="आज हम DFS और BFS एल्गोरिदम समझेंगे।",
        segment_type="concept"
    )
    db_session.add(segment)
    db_session.flush()

    # 5. Create Generated Output
    output = GeneratedOutput(
        id="out_test_1",
        lecture_id=lecture.id,
        user_id=user.id,
        output_type="notes",
        prompt_version="v1.0.0",
        cache_key="cache_key_hash_1",
        content={"summary": "Graph traversal basics"},
        model_name="gemini-1.5-flash"
    )
    db_session.add(output)
    db_session.flush()

    # Verify query
    fetched_user = db_session.query(User).filter_by(id="usr_test_1").first()
    assert fetched_user is not None
    assert len(fetched_user.lectures) == 1
    assert fetched_user.lectures[0].job.stage == JobStage.PREPARING_AUDIO.value
    assert len(fetched_user.lectures[0].transcripts[0].segments) == 1
    assert fetched_user.lectures[0].transcripts[0].segments[0].segment_type == "concept"

