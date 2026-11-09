import { env } from "@/config/env";
import { apiClient } from "./api-client";

export interface InitiateUploadPayload {
  fileName: string;
  mimeType: string;
  fileSize: number;
  title?: string;
  subject?: string;
  topic?: string;
}

export const uploadService = {
  /**
   * Initiates an upload session with POST /api/v1/uploads/initiate.
   */
  async initiateUpload(
    fileName: string,
    mimeType: string,
    fileSize: number,
    metadata?: { title?: string; subject?: string; topic?: string }
  ): Promise<{ uploadId: string; uploadUrl?: string }> {
    if (env.USE_MOCK_API) {
      return { uploadId: `mock_upload_${Date.now()}` };
    }
    return apiClient<{ uploadId: string; uploadUrl?: string }>("/uploads/initiate", {
      method: "POST",
      body: JSON.stringify({
        file_name: fileName,
        mime_type: mimeType,
        file_size: fileSize,
        title: metadata?.title,
        subject: metadata?.subject,
        topic: metadata?.topic,
      }),
    });
  },

  /**
   * Uploads binary chunk/file to PUT/POST /api/v1/uploads/{upload_id}/binary.
   */
  async uploadBinary(uploadId: string, file: File | Blob): Promise<void> {
    const formData = new FormData();
    formData.append("file", file);

    await apiClient<void>(`/uploads/${uploadId}/binary`, {
      method: "POST",
      body: formData,
    });
  },

  /**
   * Finalizes the upload with POST /api/v1/uploads/complete.
   */
  async completeUpload(uploadId: string): Promise<{ success: boolean; lecture_id?: string; job_id?: string }> {
    if (env.USE_MOCK_API) {
      return { success: true };
    }
    return apiClient<{ success: boolean; lecture_id?: string; job_id?: string }>("/uploads/complete", {
      method: "POST",
      body: JSON.stringify({ upload_id: uploadId }),
    });
  },
};
