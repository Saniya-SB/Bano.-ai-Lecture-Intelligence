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
   * MOCK: Creates a lecture record via mockStore and simulates upload
   * progress via the onProgress callback. No real file data is sent.
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
      // Simulate chunked upload progress, then create the lecture record
      const lecture = await mockStore.simulateFileUpload(
        { title: params.title, subject: params.subject, topic: params.topic },
        onProgress
      );
      return mapLectureDtoToDomain(lecture);
    }

    // ── REAL API ────────────────────────────────────────────────────────────
    // POST /uploads/direct — single-request multipart upload.
    // Returns { lecture_id, job_id, status }. After this, poll
    // GET /jobs/{lecture_id} for processing progress.
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
      // Content-Type is intentionally omitted — apiClient skips it for FormData
    });
    onProgress?.(100);
    // Fetch the full lecture record to return a Lecture domain object
    const dto = await apiClient<LectureDto>(`/lectures/${result.lecture_id}`);
    return mapLectureDtoToDomain(dto);
  },

  /**
   * Recording mode — upload a recorded audio Blob from the browser.
   *
   * MOCK: Same simulation as uploadFile.
   *
   * REAL: POST /uploads/direct with source_type="recording".
   * Accepts webm/ogg from MediaRecorder (backend validates via magic bytes).
   * Behind FEATURES.browserRecording feature flag.
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

    // POST /uploads/direct with source_type="recording"
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
   * Frontend never downloads or scrapes video content.
   *
   * MOCK: Creates a lecture record via mockStore.
   *
   * REAL: POST /uploads/youtube with FormData { url }.
   * Backend returns 501 NOT IMPLEMENTED — handled gracefully by the caller.
   * Behind FEATURES.youtubeIngestion feature flag.
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

    // POST /uploads/youtube — backend validates URL safety, then raises 501.
    // This path is behind FEATURES.youtubeIngestion = false by default.
    // The ApiError with status 501 propagates to the caller.
    const formData = new FormData();
    formData.append("url", params.youtubeUrl);

    // Backend returns 501; the resulting ApiError is propagated to the UI layer.
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
};
