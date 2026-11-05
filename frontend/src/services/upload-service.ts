import { env } from "@/config/env";
import { apiClient } from "./api-client";

export const uploadService = {
  async initiateUpload(fileName: string, mimeType: string, fileSize: number): Promise<{ uploadId: string; uploadUrl?: string }> {
    if (env.USE_MOCK_API) {
      return { uploadId: `mock_upload_${Date.now()}` };
    }
    return apiClient<{ uploadId: string; uploadUrl?: string }>("/uploads/initiate", {
      method: "POST",
      body: JSON.stringify({ file_name: fileName, mime_type: mimeType, file_size: fileSize }),
    });
  },

  async completeUpload(uploadId: string): Promise<{ success: boolean }> {
    if (env.USE_MOCK_API) {
      return { success: true };
    }
    return apiClient<{ success: boolean }>("/uploads/complete", {
      method: "POST",
      body: JSON.stringify({ upload_id: uploadId }),
    });
  },
};
