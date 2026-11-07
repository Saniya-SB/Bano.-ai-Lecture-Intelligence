from typing import Optional
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from sqlalchemy import select

from backend.app.api.deps import get_current_user
from backend.app.core.exceptions import AppException
from backend.app.db.session import get_db
from backend.app.models.entities import Lecture, User
from backend.app.models.enums import LectureStatus
from backend.app.schemas.lecture import (
    LectureCreate,
    LectureUpdate,
    LectureResponse,
)

router = APIRouter(prefix="/lectures", tags=["Lectures"])


def _format_lecture_response(lecture: Lecture) -> dict:
    return {
        "id": lecture.id,
        "title": lecture.title,
        "subject": lecture.subject,
        "topic": lecture.topic,
        "duration_seconds": lecture.duration_seconds,
        "status": lecture.status,
        "is_test_data": getattr(lecture, "is_test_data", False),
        "created_at": lecture.created_at.isoformat() if lecture.created_at else "",
        "updated_at": lecture.updated_at.isoformat() if lecture.updated_at else "",
    }


def _is_test_data_allowed() -> bool:
    """is_test_data can only be set when AUTH_MODE=dev or ENVIRONMENT != 'production'."""
    from backend.app.core.config import settings
    return settings.AUTH_MODE == "dev" or settings.ENVIRONMENT != "production"


@router.post("", response_model=LectureResponse, status_code=status.HTTP_201_CREATED)
def create_lecture(
    payload: LectureCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Create a new lecture. Ownership is enforced via current_user.id.
    is_test_data is only honored in non-production/dev environments; ignored in production.
    """
    import uuid

    is_test = payload.is_test_data if _is_test_data_allowed() else False

    lecture_id = f"lec_{uuid.uuid4().hex[:12]}"
    lecture = Lecture(
        id=lecture_id,
        user_id=current_user.id,
        title=payload.title,
        subject=payload.subject,
        topic=payload.topic,
        duration_seconds=0,
        status=LectureStatus.UPLOADED.value,
        is_test_data=is_test,
    )
    db.add(lecture)
    db.commit()
    db.refresh(lecture)
    return _format_lecture_response(lecture)


@router.get("", response_model=list[LectureResponse])
def list_lectures(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    List all lectures belonging strictly to the authenticated user.
    """
    lectures = db.scalars(
        select(Lecture)
        .where(Lecture.user_id == current_user.id)
        .order_by(Lecture.created_at.desc())
    ).all()
    return [_format_lecture_response(l) for l in lectures]


@router.get("/{lecture_id}", response_model=LectureResponse)
def get_lecture(
    lecture_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Retrieve a single lecture by ID. Ownership enforced (prevents IDOR: returns 404 if not owned).
    """
    lecture = db.scalar(
        select(Lecture).where(
            Lecture.id == lecture_id,
            Lecture.user_id == current_user.id,
        )
    )
    if not lecture:
        raise AppException(
            status_code=status.HTTP_404_NOT_FOUND,
            message=f"Lecture with ID {lecture_id} was not found",
            code="NOT_FOUND",
        )
    return _format_lecture_response(lecture)


@router.patch("/{lecture_id}", response_model=LectureResponse)
def update_lecture(
    lecture_id: str,
    payload: LectureUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Update lecture fields (e.g. title rename, subject, topic).
    Ownership enforced (returns 404 if not owned).
    """
    lecture = db.scalar(
        select(Lecture).where(
            Lecture.id == lecture_id,
            Lecture.user_id == current_user.id,
        )
    )
    if not lecture:
        raise AppException(
            status_code=status.HTTP_404_NOT_FOUND,
            message=f"Lecture with ID {lecture_id} was not found",
            code="NOT_FOUND",
        )

    updates = payload.model_dump(exclude_unset=True)
    if "is_test_data" in updates and not _is_test_data_allowed():
        # Ignore client request to set/flip is_test_data in production
        del updates["is_test_data"]

    for field, val in updates.items():
        setattr(lecture, field, val)

    db.commit()
    db.refresh(lecture)
    return _format_lecture_response(lecture)


@router.delete("/{lecture_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_lecture(
    lecture_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Delete a lecture by ID. Ownership enforced (returns 404 if not owned).
    """
    lecture = db.scalar(
        select(Lecture).where(
            Lecture.id == lecture_id,
            Lecture.user_id == current_user.id,
        )
    )
    if not lecture:
        raise AppException(
            status_code=status.HTTP_404_NOT_FOUND,
            message=f"Lecture with ID {lecture_id} was not found",
            code="NOT_FOUND",
        )

    db.delete(lecture)
    db.commit()
    return None


@router.get("/{lecture_id}/transcripts")
def get_lecture_transcripts(
    lecture_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Retrieves dual Roman and Devanagari transcript segments formatted for frontend TranscriptDto.
    """
    from backend.app.models.entities import Transcript, TranscriptSegment
    from backend.app.models.enums import TranscriptVersion

    # Verify ownership
    lecture = db.scalar(
        select(Lecture).where(
            Lecture.id == lecture_id,
            Lecture.user_id == current_user.id,
        )
    )
    if not lecture:
        raise AppException(
            status_code=status.HTTP_404_NOT_FOUND,
            message=f"Lecture with ID {lecture_id} was not found",
            code="NOT_FOUND",
        )

    # Fetch Devanagari and Roman transcripts
    dev_transcript = db.execute(
        select(Transcript).where(
            Transcript.lecture_id == lecture_id,
            Transcript.version_type == TranscriptVersion.NORMALISED.value,
        )
    ).scalar_one_or_none()

    rom_transcript = db.execute(
        select(Transcript).where(
            Transcript.lecture_id == lecture_id,
            Transcript.version_type == TranscriptVersion.ROMAN.value,
        )
    ).scalar_one_or_none()

    dev_segments = []
    if dev_transcript:
        segments = db.execute(
            select(TranscriptSegment)
            .where(TranscriptSegment.transcript_id == dev_transcript.id)
            .order_by(TranscriptSegment.start_time)
        ).scalars().all()
        dev_segments = [
            {
                "id": s.id,
                "start_time": s.start_time,
                "end_time": s.end_time,
                "text": s.text,
                "segment_type": getattr(s, "segment_type", "concept"),
            }
            for s in segments
        ]

    rom_segments = []
    if rom_transcript:
        segments = db.execute(
            select(TranscriptSegment)
            .where(TranscriptSegment.transcript_id == rom_transcript.id)
            .order_by(TranscriptSegment.start_time)
        ).scalars().all()
        rom_segments = [
            {
                "id": s.id,
                "start_time": s.start_time,
                "end_time": s.end_time,
                "text": s.text,
                "segment_type": getattr(s, "segment_type", "concept"),
            }
            for s in segments
        ]

    return {
        "id": f"tr_{lecture_id}",
        "lecture_id": lecture_id,
        "roman_segments": rom_segments,
        "devanagari_segments": dev_segments,
    }


