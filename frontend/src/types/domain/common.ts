import { ApiErrorKind } from "@/lib/error-messages";

export class ApiError extends Error {
  readonly kind: ApiErrorKind;
  readonly status: number;
  readonly userMessage: string;
  readonly fieldErrors?: Record<string, string>;
  readonly requestId?: string;

  constructor(params: {
    kind: ApiErrorKind;
    status: number;
    userMessage: string;
    fieldErrors?: Record<string, string>;
    requestId?: string;
    message?: string;
  }) {
    super(params.message || params.userMessage);
    this.name = "ApiError";
    this.kind = params.kind;
    this.status = params.status;
    this.userMessage = params.userMessage;
    this.fieldErrors = params.fieldErrors;
    this.requestId = params.requestId;
  }
}

export type LectureStatus =
  | "uploaded"
  | "processing"
  | "transcribing"
  | "generating_notes"
  | "completed"
  | "generation_failed"
  | "failed"
  | "unknown";

export interface User {
  id: string;
  email: string;
  fullName: string;
  createdAt: string;
}

export interface Lecture {
  id: string;
  title: string;
  subject: string;
  topic?: string;
  durationSeconds: number;
  status: LectureStatus;
  createdAt: string;
  updatedAt: string;
}

export type JobStage =
  | "uploading"
  | "validating"
  | "preparing_audio"
  | "transcribing"
  | "processing_transcript"
  | "generating_learning_material"
  | "completed"
  | "failed"
  | "unknown";

export interface Job {
  id: string;
  lectureId: string;
  stage: JobStage;
  progressPercent?: number;
  errorMessage?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Pagination {
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
