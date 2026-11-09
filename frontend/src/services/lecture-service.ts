import { env } from "@/config/env";
import { apiClient } from "./api-client";
import { mockStore } from "./mock/mock-store";
import { LectureDto } from "@/types/api/common";
import { Lecture } from "@/types/domain/common";
import { mapLectureDtoToDomain } from "./adapters/common-adapter";

export const lectureService = {
  async getLectures(): Promise<Lecture[]> {
    if (env.USE_MOCK_API) {
      const dtos = await mockStore.getLectures();
      return dtos.map(mapLectureDtoToDomain);
    }
    const dtos = await apiClient<LectureDto[]>("/lectures");
    return dtos.map(mapLectureDtoToDomain);
  },

  async getLectureById(id: string): Promise<Lecture> {
    if (env.USE_MOCK_API) {
      const dto = await mockStore.getLectureById(id);
      return mapLectureDtoToDomain(dto);
    }
    const dto = await apiClient<LectureDto>(`/lectures/${id}`);
    return mapLectureDtoToDomain(dto);
  },

  async createLecture(params: {
    title: string;
    subject: string;
    topic?: string;
    is_test_data?: boolean;
  }): Promise<Lecture> {
    if (env.USE_MOCK_API) {
      const dto = await mockStore.createLecture(params);
      return mapLectureDtoToDomain(dto);
    }
    const dto = await apiClient<LectureDto>("/lectures", {
      method: "POST",
      body: JSON.stringify(params),
    });
    return mapLectureDtoToDomain(dto);
  },

  /**
   * Upload mode — uploads an audio file directly to the backend.
   *
   * REAL: POST /uploads/direct with multipart FormData.
   * Accepted formats: mp3, wav, mp4, m4a, webm (backend validates via magic bytes).
   * Size limit: backend returns 413 on exceed.
   * Returns { lecture_id, job_id, status } — then fetches the lecture record
   * and returns a full Lecture domain object. Poll GET /jobs/{lecture_id}
   * for processing progress after this call.
   */
  async uploadFile(
    params: {
      title: string;
      subject: string;
      topic?: string;
      file: File;
    },
    onProgress?: (percent: number) => void
  ): Promise<Lecture> {
    if (env.USE_MOCK_API) {
      const lecture = await mockStore.simulateFileUpload(
        { title: params.title, subject: params.subject, topic: params.topic },
        onProgress
      );
      return mapLectureDtoToDomain(lecture);
    }

    onProgress?.(10);
    const formData = new FormData();
    formData.append("file", params.file);
    formData.append("title", params.title);
    formData.append("subject", params.subject);
    if (params.topic) formData.append("topic", params.topic);
    formData.append("source_type", "upload");

    const result = await apiClient<{ lecture_id: string; job_id: string; status: string }>("/uploads/direct", {
      method: "POST",
      body: formData,
    });
    onProgress?.(100);

    const dto = await apiClient<LectureDto>(`/lectures/${result.lecture_id}`);
    return mapLectureDtoToDomain(dto);
  },

  /**
   * Recording mode — upload a recorded audio Blob from the browser.
   * REAL: POST /uploads/direct with source_type="recording".
   */
  async uploadRecording(
    params: {
      title: string;
      subject: string;
      topic?: string;
      blob: Blob;
      mimeType: string;
    },
    onProgress?: (percent: number) => void
  ): Promise<Lecture> {
    if (env.USE_MOCK_API) {
      const lecture = await mockStore.simulateFileUpload(
        { title: params.title, subject: params.subject, topic: params.topic },
        onProgress
      );
      return mapLectureDtoToDomain(lecture);
    }

    onProgress?.(10);
    const ext = params.mimeType.includes("ogg") ? "ogg" : "webm";
    const file = new File([params.blob], `recording.${ext}`, { type: params.mimeType });
    const formData = new FormData();
    formData.append("file", file);
    formData.append("title", params.title);
    formData.append("subject", params.subject);
    if (params.topic) formData.append("topic", params.topic);
    formData.append("source_type", "recording");

    const result = await apiClient<{ lecture_id: string; job_id: string; status: string }>("/uploads/direct", {
      method: "POST",
      body: formData,
    });
    onProgress?.(100);

    const dto = await apiClient<LectureDto>(`/lectures/${result.lecture_id}`);
    return mapLectureDtoToDomain(dto);
  },

  /**
   * YouTube mode — submit a YouTube URL for backend caption extraction.
   */
  async createYoutubeLecture(params: {
    title: string;
    subject: string;
    topic?: string;
    youtubeUrl: string;
  }): Promise<Lecture> {
    if (env.USE_MOCK_API) {
      const dto = await mockStore.createLecture({
        title: params.title,
        subject: params.subject,
        topic: params.topic,
      });
      return mapLectureDtoToDomain(dto);
    }

    const formData = new FormData();
    formData.append("url", params.youtubeUrl);

    const result = await apiClient<{ lecture_id: string; job_id: string; status: string }>("/uploads/youtube", {
      method: "POST",
      body: formData,
    });
    const dto = await apiClient<LectureDto>(`/lectures/${result.lecture_id}`);
    return mapLectureDtoToDomain(dto);
  },

  async renameLecture(id: string, newTitle: string): Promise<Lecture> {
    if (env.USE_MOCK_API) {
      const dto = await mockStore.updateLecture(id, { title: newTitle });
      return mapLectureDtoToDomain(dto);
    }
    const dto = await apiClient<LectureDto>(`/lectures/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ title: newTitle }),
    });
    return mapLectureDtoToDomain(dto);
  },

  async deleteLecture(id: string): Promise<void> {
    if (env.USE_MOCK_API) {
      await mockStore.deleteLecture(id);
      return;
    }
    await apiClient<void>(`/lectures/${id}`, {
      method: "DELETE",
    });
  },

  /**
   * Downloads lecture notes as PDF from GET /api/v1/lectures/{id}/export/notes?format=pdf
   */
  async exportNotesPdf(id: string, title: string): Promise<void> {
    const baseUrl = env.API_URL || env.API_BASE_URL;
    const url = `${baseUrl.replace(/\/$/, "")}/lectures/${id}/export/notes?format=pdf`;
    const token = (await import("./auth-provider")).authManager.getToken();

    const headers: Record<string, string> = {};
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const res = await fetch(url, { headers });
    if (!res.ok) {
      const errorJson = await res.json().catch(() => null);
      throw new Error(errorJson?.detail || `PDF export failed with status ${res.status}`);
    }

    const blob = await res.blob();
    const downloadUrl = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = downloadUrl;
    const safeTitle = title.toLowerCase().replace(/[^a-z0-9_-]/g, "_") || "lecture";
    a.download = `${safeTitle}_notes.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(downloadUrl);
  },

  /**
   * Ask this lecture a question (English, Hindi, or Hinglish).
   */
  async askLecture(id: string, question: string): Promise<{ answer: string; is_ai_generated: boolean; answered: boolean }> {
    return apiClient<{ answer: string; is_ai_generated: boolean; answered: boolean }>(`/lectures/${id}/ask`, {
      method: "POST",
      body: JSON.stringify({ question }),
    });
  },
};
