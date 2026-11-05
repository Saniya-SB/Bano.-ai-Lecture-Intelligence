/**
 * PROVISIONAL - Pending backend contract confirmation with Owais.
 * Note: Field names follow backend snake_case convention.
 * String IDs, ISO 8601 timestamps.
 */

export type LectureStatusDto =
  | "uploaded"
  | "processing"
  | "transcribing"
  | "generating_notes"
  | "completed"
  | "failed";

export interface ApiErrorDto {
  detail?: string | { msg?: string; type?: string; loc?: (string | number)[] }[];
  message?: string;
  code?: string;
  field_errors?: Record<string, string>;
  request_id?: string;
}

export interface PaginationDto {
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface UserDto {
  id: string;
  email: string;
  full_name: string;
  created_at: string;
  updated_at?: string;
}

export interface LectureDto {
  id: string; // TODO(contract): verify id vs lecture_id
  title: string;
  subject: string;
  topic?: string;
  duration_seconds: number; // TODO(contract): verify seconds vs minutes
  status: LectureStatusDto;
  created_at: string;
  updated_at: string;
}

export type JobStageDto =
  | "uploading"
  | "validating"
  | "preparing_audio"
  | "transcribing"
  | "processing_transcript"
  | "generating_learning_material"
  | "completed"
  | "failed";

export interface JobDto {
  id: string;
  lecture_id: string;
  stage: JobStageDto;
  progress_percent?: number; // Optional: only if backend provides
  error_message?: string;
  created_at: string;
  updated_at: string;
}
