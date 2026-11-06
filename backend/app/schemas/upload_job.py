from typing import Optional, List
from pydantic import BaseModel, Field


class UploadInitiateRequest(BaseModel):
    file_name: str
    mime_type: str
    file_size: int
    lecture_id: Optional[str] = None
    title: Optional[str] = None
    subject: Optional[str] = None
    topic: Optional[str] = None


class UploadInitiateResponse(BaseModel):
    uploadId: str
    uploadUrl: Optional[str] = None


class UploadCompleteRequest(BaseModel):
    upload_id: str


class UploadCompleteResponse(BaseModel):
    success: bool
    lecture_id: Optional[str] = None
    job_id: Optional[str] = None


class JobStageDto(str):
    pass


class JobDto(BaseModel):
    id: str
    lecture_id: str
    stage: str
    progress_percent: Optional[int] = 0
    error_message: Optional[str] = None
    created_at: str
    updated_at: str


class TranscriptSegmentDto(BaseModel):
    id: str
    start_time: float
    end_time: float
    text: str


class TranscriptDto(BaseModel):
    id: str
    lecture_id: str
    roman_segments: List[TranscriptSegmentDto]
    devanagari_segments: List[TranscriptSegmentDto]

