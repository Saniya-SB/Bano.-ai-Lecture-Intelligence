from typing import Optional, Any
from datetime import datetime, timezone
from sqlalchemy import (
    String, Integer, BigInteger, Float, Numeric, Boolean, Text, JSON,
    ForeignKey, UniqueConstraint, Index, DateTime
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from backend.app.db.base import Base, TimestampMixin
from backend.app.models.enums import (
    LectureStatus, LectureSourceType, JobStage, TranscriptVersion, SegmentType, OutputType
)


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


class User(Base, TimestampMixin):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    full_name: Mapped[str] = mapped_column(String(255), nullable=False)

    lectures: Mapped[list["Lecture"]] = relationship("Lecture", back_populates="user", cascade="all, delete-orphan")
    generated_outputs: Mapped[list["GeneratedOutput"]] = relationship("GeneratedOutput", back_populates="user", cascade="all, delete-orphan")
    usage_events: Mapped[list["UsageEvent"]] = relationship("UsageEvent", back_populates="user", cascade="all, delete-orphan")


class Lecture(Base, TimestampMixin):
    __tablename__ = "lectures"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    user_id: Mapped[str] = mapped_column(String(64), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    subject: Mapped[str] = mapped_column(String(255), nullable=False)
    topic: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    duration_seconds: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    status: Mapped[str] = mapped_column(String(32), default=LectureStatus.UPLOADED.value, nullable=False, index=True)
    
    # Audio metadata & source
    sha256: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    source_type: Mapped[str] = mapped_column(String(32), default=LectureSourceType.UPLOAD.value, nullable=False)
    source_url: Mapped[Optional[str]] = mapped_column(String(1024), nullable=True)
    audio_storage_path: Mapped[Optional[str]] = mapped_column(String(1024), nullable=True)
    mime_type: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    file_size_bytes: Mapped[Optional[int]] = mapped_column(BigInteger, nullable=True)
    is_test_data: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    __table_args__ = (
        UniqueConstraint("user_id", "sha256", name="uq_user_lecture_sha256"),
    )

    user: Mapped["User"] = relationship("User", back_populates="lectures")
    job: Mapped[Optional["TranscriptionJob"]] = relationship("TranscriptionJob", back_populates="lecture", uselist=False, cascade="all, delete-orphan")
    transcripts: Mapped[list["Transcript"]] = relationship("Transcript", back_populates="lecture", cascade="all, delete-orphan")
    generated_outputs: Mapped[list["GeneratedOutput"]] = relationship("GeneratedOutput", back_populates="lecture", cascade="all, delete-orphan")


class TranscriptionJob(Base, TimestampMixin):
    __tablename__ = "transcription_jobs"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    lecture_id: Mapped[str] = mapped_column(String(64), ForeignKey("lectures.id", ondelete="CASCADE"), unique=True, nullable=False, index=True)
    provider: Mapped[str] = mapped_column(String(32), default="gnani", nullable=False)
    provider_job_id: Mapped[Optional[str]] = mapped_column(String(128), nullable=True)
    stage: Mapped[str] = mapped_column(String(32), default=JobStage.UPLOADING.value, nullable=False, index=True)
    progress_percent: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    error_message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    error_code: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    retry_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    
    started_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    lecture: Mapped["Lecture"] = relationship("Lecture", back_populates="job")


class Transcript(Base, TimestampMixin):
    __tablename__ = "transcripts"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    lecture_id: Mapped[str] = mapped_column(String(64), ForeignKey("lectures.id", ondelete="CASCADE"), nullable=False, index=True)
    version_type: Mapped[str] = mapped_column(String(32), default=TranscriptVersion.RAW.value, nullable=False)
    full_text: Mapped[str] = mapped_column(Text, nullable=False)
    language_code: Mapped[str] = mapped_column(String(32), default="hi-IN,en-IN", nullable=False)

    __table_args__ = (
        UniqueConstraint("lecture_id", "version_type", name="uq_lecture_transcript_version"),
        Index("idx_transcripts_lecture_version", "lecture_id", "version_type"),
    )

    lecture: Mapped["Lecture"] = relationship("Lecture", back_populates="transcripts")
    segments: Mapped[list["TranscriptSegment"]] = relationship("TranscriptSegment", back_populates="transcript", cascade="all, delete-orphan")


class TranscriptSegment(Base):
    __tablename__ = "transcript_segments"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    transcript_id: Mapped[str] = mapped_column(String(64), ForeignKey("transcripts.id", ondelete="CASCADE"), nullable=False, index=True)
    segment_index: Mapped[int] = mapped_column(Integer, nullable=False)
    start_time: Mapped[float] = mapped_column(Float, nullable=False)
    end_time: Mapped[float] = mapped_column(Float, nullable=False)
    text: Mapped[str] = mapped_column(Text, nullable=False)
    segment_type: Mapped[str] = mapped_column(String(32), default=SegmentType.CONCEPT.value, nullable=False, index=True)
    speaker_label: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    confidence: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, nullable=False)

    __table_args__ = (
        Index("idx_segments_transcript_time", "transcript_id", "start_time"),
    )

    transcript: Mapped["Transcript"] = relationship("Transcript", back_populates="segments")


class GeneratedOutput(Base, TimestampMixin):
    __tablename__ = "generated_outputs"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    lecture_id: Mapped[str] = mapped_column(String(64), ForeignKey("lectures.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id: Mapped[str] = mapped_column(String(64), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    output_type: Mapped[str] = mapped_column(String(32), nullable=False)
    prompt_version: Mapped[str] = mapped_column(String(32), nullable=False)
    cache_key: Mapped[str] = mapped_column(String(128), nullable=False, index=True)
    content: Mapped[dict[str, Any]] = mapped_column(JSON, nullable=False)
    model_name: Mapped[str] = mapped_column(String(64), nullable=False)
    token_usage: Mapped[Optional[dict[str, Any]]] = mapped_column(JSON, nullable=True)

    __table_args__ = (
        UniqueConstraint("user_id", "cache_key", name="uq_user_output_cache_key"),
        Index("idx_outputs_lecture_user", "lecture_id", "user_id"),
    )

    user: Mapped["User"] = relationship("User", back_populates="generated_outputs")
    lecture: Mapped["Lecture"] = relationship("Lecture", back_populates="generated_outputs")


class UsageEvent(Base):
    __tablename__ = "usage_events"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    user_id: Mapped[str] = mapped_column(String(64), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    lecture_id: Mapped[Optional[str]] = mapped_column(String(64), ForeignKey("lectures.id", ondelete="SET NULL"), nullable=True)
    event_type: Mapped[str] = mapped_column(String(64), nullable=False)
    quantity: Mapped[float] = mapped_column(Numeric(12, 4), nullable=False)
    estimated_cost_usd: Mapped[float] = mapped_column(Numeric(10, 6), default=0.0, nullable=False)
    metadata_json: Mapped[Optional[dict[str, Any]]] = mapped_column("metadata", JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, nullable=False, index=True)

    user: Mapped["User"] = relationship("User", back_populates="usage_events")


class ReferenceTranscript(Base, TimestampMixin):
    __tablename__ = "reference_transcripts"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    dataset_name: Mapped[str] = mapped_column(String(128), nullable=False)
    sample_name: Mapped[str] = mapped_column(String(128), nullable=False)
    audio_path: Mapped[str] = mapped_column(String(1024), nullable=False)
    duration_seconds: Mapped[int] = mapped_column(Integer, nullable=False)
    ground_truth_devanagari: Mapped[str] = mapped_column(Text, nullable=False)
    ground_truth_roman: Mapped[str] = mapped_column(Text, nullable=False)
    technical_terms: Mapped[list[str]] = mapped_column(JSON, nullable=False)
    consent_for_benchmark: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    __table_args__ = (
        UniqueConstraint("dataset_name", "sample_name", name="uq_dataset_sample"),
    )

    benchmark_runs: Mapped[list["BenchmarkRun"]] = relationship("BenchmarkRun", back_populates="reference", cascade="all, delete-orphan")


class BenchmarkRun(Base):
    __tablename__ = "benchmark_runs"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    reference_id: Mapped[str] = mapped_column(String(64), ForeignKey("reference_transcripts.id", ondelete="CASCADE"), nullable=False, index=True)
    model_id: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    model_name: Mapped[str] = mapped_column(String(128), nullable=False)
    provider_version: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    hypothesis_transcript: Mapped[str] = mapped_column(Text, nullable=False)
    wer: Mapped[float] = mapped_column(Numeric(6, 2), nullable=False)
    cer: Mapped[float] = mapped_column(Numeric(6, 2), nullable=False)
    technical_term_accuracy: Mapped[float] = mapped_column(Numeric(6, 2), nullable=False)
    code_switch_score: Mapped[Optional[float]] = mapped_column(Numeric(6, 2), nullable=True)
    hindi_accuracy: Mapped[Optional[float]] = mapped_column(Numeric(6, 2), nullable=True)
    english_accuracy: Mapped[Optional[float]] = mapped_column(Numeric(6, 2), nullable=True)
    processing_time_sec: Mapped[float] = mapped_column(Numeric(8, 2), nullable=False)
    estimated_cost_usd: Mapped[float] = mapped_column(Numeric(8, 4), nullable=False)
    is_estimated: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    run_timestamp: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, nullable=False)

    reference: Mapped["ReferenceTranscript"] = relationship("ReferenceTranscript", back_populates="benchmark_runs")
