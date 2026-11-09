import { env } from "@/config/env";

export interface FeatureFlags {
  transcriptEditing: boolean;
  regenerateNotes: boolean;
  regenerateOutputs: boolean;
  processingRetry: boolean;
  rememberSession: boolean;
  changePassword: boolean;
  profileUpdate: boolean;
  accountDeletion: boolean;
  usageInfo: boolean;
  quota: boolean;
  resetPasswordConfirm: boolean;
  serverSideListQuery: boolean;
  /**
   * Browser audio recording via MediaRecorder.
   * Real-API path is behind this flag until Owais confirms the expected
   * audio format, endpoint, and upload payload contract.
   */
  browserRecording: boolean;
  /**
   * YouTube URL ingestion.
   * Real-API path is behind this flag until Owais confirms the request
   * payload shape (youtube_url field, source_type, etc.).
   */
  youtubeIngestion: boolean;
}

const mockFlags: FeatureFlags = {
  transcriptEditing: true,
  regenerateNotes: true,
  regenerateOutputs: true,
  processingRetry: true,
  rememberSession: true,
  changePassword: true,
  profileUpdate: true,
  accountDeletion: true,
  usageInfo: true,
  quota: true,
  resetPasswordConfirm: true,
  serverSideListQuery: false,
  browserRecording: true,
  youtubeIngestion: true,
};

const defaultFlags: FeatureFlags = {
  transcriptEditing: false,
  regenerateNotes: false,
  regenerateOutputs: false,
  processingRetry: true, // Enabled for Phase F2 job retry
  rememberSession: false,
  changePassword: false,
  profileUpdate: false,
  accountDeletion: false,
  usageInfo: false,
  quota: false,
  resetPasswordConfirm: false,
  serverSideListQuery: false,
  browserRecording: true, // Enabled for Phase F2 in-browser mic recording
  youtubeIngestion: false,
};

export const getFeatureFlags = (): FeatureFlags => {
  return env.USE_MOCK_API ? mockFlags : defaultFlags;
};

export const FEATURES = getFeatureFlags();
