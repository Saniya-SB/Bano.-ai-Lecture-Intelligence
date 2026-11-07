import { JobDto } from "@/types/api/common";
import { Job, JobStage } from "@/types/domain/common";

const VALID_STAGES: Set<JobStage> = new Set([
  "uploading",
  "validating",
  "preparing_audio",
  "transcribing",
  "processing_transcript",
  "generating_learning_material",
  "completed",
  "failed",
  "unknown",
]);

export function mapJobDtoToDomain(dto: JobDto): Job {
  const stage = (VALID_STAGES.has(dto.stage as JobStage)
    ? dto.stage
    : "unknown") as JobStage;

  return {
    id: dto.id,
    lectureId: dto.lecture_id,
    stage,
    progressPercent:
      typeof dto.progress_percent === "number"
        ? Math.min(100, Math.max(0, dto.progress_percent))
        : undefined,
    errorMessage: dto.error_message,
    createdAt: dto.created_at,
    updatedAt: dto.updated_at,
  };
}
