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
   * Upload mode — Step 1: Initiate upload and receive a lecture record.
   *
   * MOCK: Creates a lecture record via mockStore and simulates upload
   * progress via the onProgress callback. No real file data is sent.
   *
   * REAL (PROVISIONAL — pending Owais confirmation of Q1):
   * Currently falls back to POST /lectures. When the backend confirms
   * the two-step initiate/complete flow (POST /uploads/initiate →
   * PUT presigned URL → POST /uploads/complete), this stub must be
   * updated. Do NOT call unconfirmed endpoints here.
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

    // ── REAL API (provisional stub) ────────────────────────────────────────
    // Q1: Confirm upload flow — initiate/presigned or direct multipart.
    // Q2: Confirm accepted MIME types.
    // Q3: Confirm how size limit is communicated (413 body or header).
    // Until confirmed, we use a simple multipart POST as a placeholder.
    // This path is NOT reachable in production until FEATURES.browserRecording
    // is enabled by confirming the backend contract.
    onProgress?.(10);
    const formData = new FormData();
    formData.append("file", params.file);
    formData.append("title", params.title);
    formData.append("subject", params.subject);
    if (params.topic) formData.append("topic", params.topic);

    const dto = await apiClient<LectureDto>("/lectures/upload", {
      method: "POST",
      body: formData,
      // Content-Type is intentionally omitted — apiClient skips it for FormData
    });
    onProgress?.(100);
    return mapLectureDtoToDomain(dto);
  },

  /**
   * Recording mode — upload a recorded audio Blob from the browser.
   *
   * MOCK: Same simulation as uploadFile.
   *
   * REAL (PROVISIONAL — pending Owais confirmation of Q4):
   * Q4: What codec/container does the backend expect for MediaRecorder output?
   * Until confirmed this is behind FEATURES.browserRecording = false.
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

    // Provisional stub — awaiting Q4 confirmation
    onProgress?.(10);
    const ext = params.mimeType.includes("ogg") ? "ogg" : "webm";
    const file = new File([params.blob], `recording.${ext}`, { type: params.mimeType });
    const formData = new FormData();
    formData.append("file", file);
    formData.append("title", params.title);
    formData.append("subject", params.subject);
    if (params.topic) formData.append("topic", params.topic);

    const dto = await apiClient<LectureDto>("/lectures/upload", {
      method: "POST",
      body: formData,
    });
    onProgress?.(100);
    return mapLectureDtoToDomain(dto);
  },

  /**
   * YouTube mode — submit a YouTube URL for backend caption/audio extraction.
   * Frontend never downloads or scrapes video content.
   *
   * MOCK: Creates a lecture record via mockStore.
   *
   * REAL (PROVISIONAL — pending Owais confirmation of Q5):
   * Q5: Confirm payload shape (youtube_url, source_type, etc.).
   * Behind FEATURES.youtubeIngestion = false in production.
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

    // Provisional stub — awaiting Q5 confirmation of payload shape
    const dto = await apiClient<LectureDto>("/lectures", {
      method: "POST",
      body: JSON.stringify({
        title: params.title,
        subject: params.subject,
        topic: params.topic,
        // Q5: confirm field names with Owais
        source_type: "youtube",
        youtube_url: params.youtubeUrl,
      }),
    });
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
