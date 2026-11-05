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
