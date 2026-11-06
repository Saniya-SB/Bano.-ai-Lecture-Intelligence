from datetime import datetime, timezone
from typing import Optional
from sqlalchemy.orm import Session
from sqlalchemy import select

from backend.app.core.config import settings
from backend.app.core.exceptions import AppException
from backend.app.core.logging import logger
from backend.app.models.entities import TranscriptionJob, Lecture
from backend.app.models.enums import JobStage, LectureStatus, can_transition_job_stage


class JobStateMachine:
    """Encapsulates valid state transitions and retries for TranscriptionJob."""

    @staticmethod
    def transition(
        db: Session,
        job: TranscriptionJob,
        next_stage: JobStage,
        progress_percent: Optional[int] = None,
        error_message: Optional[str] = None,
        error_code: Optional[str] = None,
    ) -> TranscriptionJob:
        """
        Transitions job to next_stage if permitted by ALLOWED_JOB_STAGE_TRANSITIONS.
        Also synchronizes Lecture.status accordingly.
        """
        current_stage = JobStage(job.stage)
        if not can_transition_job_stage(current_stage, next_stage):
            raise AppException(
                status_code=400,
                message=f"Invalid job state transition from {current_stage.value} to {next_stage.value}",
                code="INVALID_STATE_TRANSITION",
            )

        job.stage = next_stage.value
        if progress_percent is not None:
            job.progress_percent = progress_percent

        now = datetime.now(timezone.utc)
        if next_stage == JobStage.VALIDATING and not job.started_at:
            job.started_at = now

        if next_stage in (JobStage.COMPLETED, JobStage.FAILED, JobStage.CANCELLED):
            job.completed_at = now

        if error_message:
            job.error_message = error_message
        if error_code:
            job.error_code = error_code

        # Synchronize lecture status
        lecture = job.lecture
        if lecture:
            if next_stage == JobStage.VALIDATING:
                lecture.status = LectureStatus.PROCESSING.value
            elif next_stage == JobStage.PREPARING_AUDIO:
                lecture.status = LectureStatus.PROCESSING.value
            elif next_stage == JobStage.TRANSCRIBING:
                lecture.status = LectureStatus.TRANSCRIBING.value
            elif next_stage == JobStage.PROCESSING_TRANSCRIPT:
                lecture.status = LectureStatus.PROCESSING.value
            elif next_stage == JobStage.GENERATING_LEARNING_MATERIAL:
                lecture.status = LectureStatus.GENERATING_NOTES.value
            elif next_stage == JobStage.COMPLETED:
                lecture.status = LectureStatus.COMPLETED.value
            elif next_stage == JobStage.FAILED:
                lecture.status = LectureStatus.FAILED.value

        db.add(job)
        if lecture:
            db.add(lecture)
        db.commit()
        db.refresh(job)
        logger.info(f"Job {job.id} transitioned to stage {next_stage.value} (progress={job.progress_percent}%)")
        return job

    @staticmethod
    def handle_failure(
        db: Session,
        job: TranscriptionJob,
        error_message: str,
        error_code: str = "PROCESSING_FAILED",
    ) -> TranscriptionJob:
        """Transitions job to FAILED state and updates lecture status."""
        return JobStateMachine.transition(
            db=db,
            job=job,
            next_stage=JobStage.FAILED,
            error_message=error_message,
            error_code=error_code,
        )

    @staticmethod
    def recover_stuck_jobs(db: Session) -> int:
        """
        On application startup, inspects jobs in non-terminal states.
        If retry_count < MAX_JOB_RETRIES, marks for retry or fails jobs exceeding retries.
        """
        non_terminal_stages = [
            JobStage.UPLOADING.value,
            JobStage.VALIDATING.value,
            JobStage.PREPARING_AUDIO.value,
            JobStage.TRANSCRIBING.value,
            JobStage.PROCESSING_TRANSCRIPT.value,
            JobStage.GENERATING_LEARNING_MATERIAL.value,
        ]

        stmt = select(TranscriptionJob).where(TranscriptionJob.stage.in_(non_terminal_stages))
        stuck_jobs = db.execute(stmt).scalars().all()
        recovered_count = 0

        for job in stuck_jobs:
            logger.warning(f"Found stuck job {job.id} at stage {job.stage} (retries={job.retry_count})")
            if job.retry_count < settings.MAX_JOB_RETRIES:
                job.retry_count += 1
                job.error_message = f"Process restarted while in stage {job.stage}; scheduled for resumption"
                # Keep in existing stage or reset to VALIDATING to allow re-run
                db.add(job)
            else:
                job.stage = JobStage.FAILED.value
                job.error_code = "STARTUP_RECOVERY_EXCEEDED_RETRIES"
                job.error_message = "Job failed after server restart: maximum retry attempts exceeded"
                job.completed_at = datetime.now(timezone.utc)
                if job.lecture:
                    job.lecture.status = LectureStatus.FAILED.value
                    db.add(job.lecture)
                db.add(job)
            recovered_count += 1

        db.commit()
        return recovered_count

