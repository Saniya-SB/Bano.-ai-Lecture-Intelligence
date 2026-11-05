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
};

const defaultFlags: FeatureFlags = {
  transcriptEditing: false,
  regenerateNotes: false,
  regenerateOutputs: false,
  processingRetry: false,
  rememberSession: false,
  changePassword: false,
  profileUpdate: false,
  accountDeletion: false,
  usageInfo: false,
  quota: false,
  resetPasswordConfirm: false,
  serverSideListQuery: false,
};

export const getFeatureFlags = (): FeatureFlags => {
  return env.USE_MOCK_API ? mockFlags : defaultFlags;
};

export const FEATURES = getFeatureFlags();
