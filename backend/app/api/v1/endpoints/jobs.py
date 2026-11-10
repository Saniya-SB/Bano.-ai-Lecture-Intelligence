from fastapi import APIRouter, Depends, status, BackgroundTasks
from sqlalchemy.orm import Session
from sqlalchemy import select

from backend.app.core.exceptions import AppException
from backend.app.db.session import get_db
from backend.app.api.deps import get_current_user
from backend.app.models.entities import User, TranscriptionJob, Lecture
from backend.app.models.enums import JobStage, LectureStatus
from backend.app.schemas.upload_job import JobDto
from backend.app.services.pipeline_worker import process_lecture_pipeline

router = APIRouter(prefix="/jobs", tags=["Jobs"])


@router.post("/{identifier}/retry", response_model=JobDto)
def retry_job(
    identifier: str,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Retries a failed processing job for a lecture or job ID.
    Enforces user ownership check.
    """
    stmt = select(TranscriptionJob).where(TranscriptionJob.id == identifier)
    job = db.execute(stmt).scalar_one_or_none()

    if not job:
        stmt = select(TranscriptionJob).where(TranscriptionJob.lecture_id == identifier)
        job = db.execute(stmt).scalar_one_or_none()

    if not job:
        raise AppException(
            status_code=status.HTTP_404_NOT_FOUND,
            message="Transcription job not found",
            code="JOB_NOT_FOUND",
        )

    lecture = db.execute(select(Lecture).where(Lecture.id == job.lecture_id)).scalar_one_or_none()
    if not lecture or lecture.user_id != current_user.id:
        raise AppException(
            status_code=status.HTTP_404_NOT_FOUND,
            message="Transcription job not found",
            code="JOB_NOT_FOUND",
        )

    # Reset job and lecture states
    job.stage = JobStage.VALIDATING.value
    job.progress_percent = 5
    job.error_message = None
    job.error_code = None
    job.retry_count = (job.retry_count or 0) + 1
    lecture.status = LectureStatus.PROCESSING.value

    db.add(job)
    db.add(lecture)
    db.commit()
    db.refresh(job)

    # Launch processing pipeline in background
    background_tasks.add_task(process_lecture_pipeline, lecture.id)

    return JobDto(
        id=job.id,
        lecture_id=job.lecture_id,
        stage=job.stage,
        progress_percent=job.progress_percent,
        error_message=job.error_message,
        created_at=job.created_at.isoformat() if job.created_at else "",
        updated_at=job.updated_at.isoformat() if job.updated_at else "",
    )


@router.get("/{identifier}", response_model=JobDto)
def get_job(
    identifier: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Retrieves job state by either Job ID or Lecture ID.
    Enforces user ownership security check.
    """
    # 1. Try finding by job ID
    stmt = select(TranscriptionJob).where(TranscriptionJob.id == identifier)
    job = db.execute(stmt).scalar_one_or_none()

    # 2. If not found, try finding by lecture ID (as expected by frontend jobService.getJob(lectureId))
    if not job:
        stmt = select(TranscriptionJob).where(TranscriptionJob.lecture_id == identifier)
        job = db.execute(stmt).scalar_one_or_none()

    if not job:
        raise AppException(
            status_code=status.HTTP_404_NOT_FOUND,
            message="Transcription job not found",
            code="JOB_NOT_FOUND",
        )

    # Ownership check
    lecture = db.execute(select(Lecture).where(Lecture.id == job.lecture_id)).scalar_one_or_none()
    if not lecture or lecture.user_id != current_user.id:
        raise AppException(
            status_code=status.HTTP_404_NOT_FOUND,
            message="Transcription job not found",
            code="JOB_NOT_FOUND",
        )

    return JobDto(
        id=job.id,
        lecture_id=job.lecture_id,
        stage=job.stage,
        progress_percent=job.progress_percent,
        error_message=job.error_message,
        created_at=job.created_at.isoformat() if job.created_at else "",
        updated_at=job.updated_at.isoformat() if job.updated_at else "",
    )

