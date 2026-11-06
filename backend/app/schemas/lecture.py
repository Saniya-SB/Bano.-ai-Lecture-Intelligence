from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field


class UserResponse(BaseModel):
    id: str
    email: str
    full_name: str
    created_at: str
    updated_at: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class LectureBase(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    subject: str = Field(..., min_length=1, max_length=255)
    topic: Optional[str] = Field(None, max_length=255)


class LectureCreate(LectureBase):
    pass


class LectureUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=255)
    subject: Optional[str] = Field(None, min_length=1, max_length=255)
    topic: Optional[str] = Field(None, max_length=255)


class LectureResponse(BaseModel):
    id: str
    title: str
    subject: str
    topic: Optional[str] = None
    duration_seconds: int = 0
    status: str
    created_at: str
    updated_at: str

    model_config = ConfigDict(from_attributes=True)

