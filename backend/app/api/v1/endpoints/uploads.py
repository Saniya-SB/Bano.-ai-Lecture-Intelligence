import io
import uuid
from pathlib import Path
from typing import Optional
from fastapi import APIRouter, Depends, UploadFile, File, Form, BackgroundTasks, status
from sqlalchemy.orm import Session
from sqlalchemy import select

from backend.app.core.config import settings
from backend.app.core.exceptions import AppException
from backend.app.core.logging import logger
from backend.app.db.session import get_db
from backend.app.api.deps import get_current_user
from backend.app.models.entities import User, Lecture, TranscriptionJob
from backend.app.models.enums import LectureStatus, LectureSourceType, JobStage
from backend.app.schemas.upload_job import (
    UploadInitiateRequest,
    UploadInitiateResponse,
    UploadCompleteRequest,
    UploadCompleteResponse,
)
from backend.app.services.storage import get_storage_adapter
from backend.app.services.validators import (
    validate_file_metadata,
    validate_magic_bytes,
    compute_sha256,
    validate_youtube_url_safety,
)
from backend.app.services.pipeline_worker import process_lecture_pipeline

router = APIRouter(prefix="/uploads", tags=["Uploads"])

# In-memory or cache tracking for initiated uploads
_pending_uploads: dict[str, dict] = {}


@router.post("/initiate", response_model=UploadInitiateResponse)
def initiate_upload(
    payload: UploadInitiateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Step 1: Validate payload and initiate upload session.
    """
    validate_file_metadata(payload.file_size)

    if payload.lecture_id:
        existing_lec = db.scalar(select(Lecture).where(Lecture.id == payload.lecture_id))
        if existing_lec and existing_lec.user_id != current_user.id:
            raise AppException(
                status_code=status.HTTP_404_NOT_FOUND,
                message="Lecture not found",
                code="NOT_FOUND",
            )

    upload_id = f"upl_{uuid.uuid4().hex}"
    _pending_uploads[upload_id] = {
        "user_id": current_user.id,
        "file_name": payload.file_name,
        "mime_type": payload.mime_type,
        "file_size": payload.file_size,
        "lecture_id": payload.lecture_id,
        "title": payload.title or payload.file_name.rsplit(".", 1)[0],
        "subject": payload.subject or "General",
        "topic": payload.topic,
    }

    # For local storage, uploadUrl directs to /uploads/{upload_id}/binary
    upload_url = f"{settings.API_V1_STR}/uploads/{upload_id}/binary"
    return UploadInitiateResponse(uploadId=upload_id, uploadUrl=upload_url)


@router.put("/{upload_id}/binary")
@router.post("/{upload_id}/binary")
async def upload_file_binary(
    upload_id: str,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Direct binary upload destination for local/development storage.
    """
    session = _pending_uploads.get(upload_id)
    if not session or session.get("user_id") != current_user.id:
        raise AppException(
            status_code=status.HTTP_404_NOT_FOUND,
            message="Upload session not found or expired",
            code="UPLOAD_SESSION_NOT_FOUND",
        )

    storage = get_storage_adapter()
    file_bytes = await file.read()
    
    # Validate magic bytes
    is_valid, detected_format = validate_magic_bytes(file_bytes[:32])
    if not is_valid:
        raise AppException(
            status_code=status.HTTP_400_BAD_REQUEST,
            message=f"File content signature is invalid ({detected_format})",
            code="INVALID_FILE_SIGNATURE",
        )

    # Save to storage (sanitize filename to prevent directory traversal)
    safe_filename = Path(file.filename or "audio").name
    dest_path = f"audio/{current_user.id}/{upload_id}_{safe_filename}"
    storage_path = storage.save_file(io.BytesIO(file_bytes), dest_path)
    session["storage_path"] = storage_path
    session["file_bytes"] = file_bytes
    session["sha256"] = compute_sha256(io.BytesIO(file_bytes))

    return {"uploaded": True, "size": len(file_bytes)}


@router.post("/complete", response_model=UploadCompleteResponse)
async def complete_upload(
    payload: UploadCompleteRequest,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Step 2: Complete upload, perform per-user SHA-256 duplicate detection,
    persist Lecture & TranscriptionJob records, and enqueue BackgroundTasks processing.
    """
    session = _pending_uploads.get(payload.upload_id)
    if not session or session.get("user_id") != current_user.id:
        raise AppException(
            status_code=status.HTTP_404_NOT_FOUND,
            message="Invalid or expired upload ID",
            code="INVALID_UPLOAD_ID",
        )
    _pending_uploads.pop(payload.upload_id, None)

    storage_path = session.get("storage_path")
    sha256_hash = session.get("sha256")

    # If binary endpoint wasn't called (e.g. mock or presigned S3 stub), check if file already stored
    if not storage_path or not sha256_hash:
        raise AppException(
            status_code=status.HTTP_400_BAD_REQUEST,
            message="No file content uploaded for this session",
            code="MISSING_FILE_PAYLOAD",
        )

    # Per-user duplicate detection via SHA-256
    stmt = select(Lecture).where(Lecture.user_id == current_user.id, Lecture.sha256 == sha256_hash)
    existing_lecture = db.execute(stmt).scalar_one_or_none()
    if existing_lecture:
        raise AppException(
            status_code=status.HTTP_409_CONFLICT,
            message=f"A lecture with identical audio content already exists (ID: {existing_lecture.id})",
            code="DUPLICATE_LECTURE_AUDIO",
        )

    # Create or update Lecture
    lecture_id = session.get("lecture_id") or f"lec_{uuid.uuid4().hex[:12]}"
    if session.get("lecture_id"):
        existing_lec = db.scalar(select(Lecture).where(Lecture.id == lecture_id))
        if existing_lec and existing_lec.user_id != current_user.id:
            raise AppException(
                status_code=status.HTTP_404_NOT_FOUND,
                message="Lecture not found",
                code="NOT_FOUND",
            )
    lecture = Lecture(
        id=lecture_id,
        user_id=current_user.id,
        title=session["title"],
        subject=session["subject"],
        topic=session.get("topic"),
        status=LectureStatus.PROCESSING.value,
        source_type=LectureSourceType.UPLOAD.value,
        sha256=sha256_hash,
        mime_type=session.get("mime_type"),
        file_size_bytes=session.get("file_size"),
        audio_storage_path=storage_path,
    )
    db.add(lecture)
    db.flush()

    # Create TranscriptionJob
    job_id = f"job_{uuid.uuid4().hex[:12]}"
    job = TranscriptionJob(
        id=job_id,
        lecture_id=lecture.id,
        provider="gnani",
        stage=JobStage.VALIDATING.value,
        progress_percent=5,
    )
    db.add(job)
    db.commit()

    # Enqueue pipeline execution with FastAPI BackgroundTasks
    background_tasks.add_task(process_lecture_pipeline, lecture.id)

    return UploadCompleteResponse(
        success=True,
        lecture_id=lecture.id,
        job_id=job.id,
    )


@router.post("/direct")
async def direct_upload(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    title: Optional[str] = Form(None),
    subject: Optional[str] = Form("General"),
    topic: Optional[str] = Form(None),
    source_type: Optional[str] = Form("upload"),  # "upload" or "recording"
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Direct single-request upload for audio files and in-app recordings (mp3, wav, mp4, m4a, webm).
    """
    file_bytes = await file.read()
    validate_file_metadata(len(file_bytes))

    # Magic byte check
    is_valid, detected_format = validate_magic_bytes(file_bytes[:32])
    if not is_valid:
        raise AppException(
            status_code=status.HTTP_400_BAD_REQUEST,
            message=f"Uploaded file magic-byte signature is invalid ({detected_format})",
            code="INVALID_FILE_SIGNATURE",
        )

    # SHA-256 duplicate check
    sha256_hash = compute_sha256(io.BytesIO(file_bytes))
    stmt = select(Lecture).where(Lecture.user_id == current_user.id, Lecture.sha256 == sha256_hash)
    existing_lecture = db.execute(stmt).scalar_one_or_none()
    if existing_lecture:
        raise AppException(
            status_code=status.HTTP_409_CONFLICT,
            message=f"A lecture with identical audio content already exists (ID: {existing_lecture.id})",
            code="DUPLICATE_LECTURE_AUDIO",
        )

    storage = get_storage_adapter()
    lecture_id = f"lec_{uuid.uuid4().hex[:12]}"
    safe_filename = Path(file.filename or "audio").name
    dest_path = f"audio/{current_user.id}/{lecture_id}_{safe_filename}"
    storage_path = storage.save_file(io.BytesIO(file_bytes), dest_path)

    lec_source = LectureSourceType.RECORDING.value if source_type == "recording" else LectureSourceType.UPLOAD.value
    lecture = Lecture(
        id=lecture_id,
        user_id=current_user.id,
        title=title or file.filename.rsplit(".", 1)[0],
        subject=subject or "General",
        topic=topic,
        status=LectureStatus.PROCESSING.value,
        source_type=lec_source,
        sha256=sha256_hash,
        mime_type=file.content_type,
        file_size_bytes=len(file_bytes),
        audio_storage_path=storage_path,
    )
    db.add(lecture)
    db.flush()

    job_id = f"job_{uuid.uuid4().hex[:12]}"
    job = TranscriptionJob(
        id=job_id,
        lecture_id=lecture.id,
        provider="gnani",
        stage=JobStage.VALIDATING.value,
        progress_percent=5,
    )
    db.add(job)
    db.commit()

    background_tasks.add_task(process_lecture_pipeline, lecture.id)

    return {
        "lecture_id": lecture.id,
        "job_id": job.id,
        "status": lecture.status,
    }


@router.post("/youtube")
def youtube_ingest(
    url: str = Form(...),
    current_user: User = Depends(get_current_user),
):
    """
    YouTube ingestion endpoint.
    Performs full SSRF & URL validation, but returns clean 501 stub per project policy.
    """
    safe_url = validate_youtube_url_safety(url)
    raise AppException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        message="YouTube transcription via authorized captions only; arbitrary audio/video stream downloading is not supported yet.",
        code="YOUTUBE_DOWNLOAD_NOT_SUPPORTED",
    )

