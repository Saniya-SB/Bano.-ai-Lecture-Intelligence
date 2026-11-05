export type ApiErrorKind =
  | "network"
  | "timeout"
  | "unauthorized"
  | "forbidden"
  | "not-found"
  | "validation"
  | "conflict"
  | "rate-limited"
  | "server"
  | "unknown";

export const ERROR_MESSAGES: Record<ApiErrorKind, string> = {
  network: "Unable to connect to the server. Please check your internet connection.",
  timeout: "This is taking longer than expected. Please try again.",
  unauthorized: "Your session has expired. Please sign in again.",
  forbidden: "You do not have permission to access this resource.",
  "not-found": "The requested resource could not be found.",
  validation: "Please check the entered information and try again.",
  conflict: "This operation conflicts with the current state.",
  "rate-limited": "Too many requests. Please wait a moment and try again.",
  server: "An unexpected server error occurred. Please try again later.",
  unknown: "Something went wrong. Please try again.",
};

export const DOMAIN_ERROR_MESSAGES = {
  unsupportedFormat: "The selected file format is not supported. Please upload an MP3, WAV, M4A, MP4, or WEBM file.",
  fileTooLarge: "The file exceeds the maximum allowed upload size.",
  micPermissionDenied: "Microphone access was denied. Please allow microphone permissions in your browser settings to record.",
  micUnsupported: "Audio recording is not supported on this browser. Please use the upload option instead.",
  processingFailed: "Lecture processing could not be completed. You can retry or check your lecture history.",
  missingTranscript: "No transcript is available for this lecture yet.",
  notesFailed: "Notes could not be generated. Please try regenerating them.",
  quizUnavailable: "The quiz for this lecture is not ready yet.",
  benchmarkUnavailable: "Benchmark data is currently unavailable.",
} as const;

export function getErrorMessage(kindOrError: ApiErrorKind | unknown, fallback?: string): string {
  if (typeof kindOrError === "string") {
    return fallback || ERROR_MESSAGES[kindOrError as ApiErrorKind] || ERROR_MESSAGES.unknown;
  }
  if (kindOrError instanceof Error) {
    return kindOrError.message || ERROR_MESSAGES.unknown;
  }
  return fallback || ERROR_MESSAGES.unknown;
}

/** Generic "invalid credentials" — never reveals which field was wrong (blueprint §5.3). */
export const INVALID_CREDENTIALS_MESSAGE =
  "Invalid email or password. Please check your details and try again.";
