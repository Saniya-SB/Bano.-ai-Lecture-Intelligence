import { LectureDto, LectureStatusDto, JobDto, JobStageDto, UserDto } from "@/types/api/common";
import { Lecture, LectureStatus, Job, JobStage, User } from "@/types/domain/common";

const VALID_STATUSES: Set<string> = new Set([
  "uploaded",
  "processing",
  "transcribing",
  "generating_notes",
  "completed",
  "failed",
]);

export function mapLectureStatus(status: LectureStatusDto | string): LectureStatus {
  if (VALID_STATUSES.has(status)) {
    return status as LectureStatus;
  }
  return "unknown";
}

export function mapLectureDtoToDomain(dto: LectureDto): Lecture {
  return {
    id: dto.id,
    title: dto.title,
    subject: dto.subject,
    topic: dto.topic,
    durationSeconds: dto.duration_seconds,
    status: mapLectureStatus(dto.status),
    createdAt: dto.created_at,
    updatedAt: dto.updated_at,
  };
}

const VALID_JOB_STAGES: Set<string> = new Set([
  "uploading",
  "validating",
  "preparing_audio",
  "transcribing",
  "processing_transcript",
  "generating_learning_material",
  "completed",
  "failed",
]);

export function mapJobStage(stage: JobStageDto | string): JobStage {
  if (VALID_JOB_STAGES.has(stage)) {
    return stage as JobStage;
  }
  return "unknown";
}

export function mapJobDtoToDomain(dto: JobDto): Job {
  return {
    id: dto.id,
    lectureId: dto.lecture_id,
    stage: mapJobStage(dto.stage),
    progressPercent: dto.progress_percent,
    errorMessage: dto.error_message,
    createdAt: dto.created_at,
    updatedAt: dto.updated_at,
  };
}

export function mapUserDtoToDomain(dto: UserDto): User {
  return {
    id: dto.id,
    email: dto.email,
    fullName: dto.full_name,
    createdAt: dto.created_at,
  };
}
