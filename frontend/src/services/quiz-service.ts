import { env } from "@/config/env";
import { apiClient } from "./api-client";
import { mockStore } from "./mock/mock-store";
import { QuizDto } from "@/types/api/materials";
import { Quiz } from "@/types/domain/materials";
import { mapQuizDtoToDomain } from "./adapters/materials-adapter";

export const quizService = {
  /**
   * Generates an on-demand quiz for the given lecture.
   * Proposed contract: POST /api/v1/lectures/{id}/quiz?num_questions=5
   */
  async generateQuiz(lectureId: string, numQuestions = 5): Promise<Quiz> {
    const validCount = Math.min(15, Math.max(1, numQuestions));

    if (env.USE_MOCK_API) {
      const dto = await mockStore.generateQuiz(lectureId, validCount);
      return mapQuizDtoToDomain(dto);
    }

    const dto = await apiClient<QuizDto>(
      `/lectures/${lectureId}/quiz?num_questions=${validCount}`,
      {
        method: "POST",
      }
    );
    return mapQuizDtoToDomain(dto);
  },

  /**
   * Fetches an already generated quiz if available.
   */
  async getQuiz(lectureId: string): Promise<Quiz | null> {
    if (env.USE_MOCK_API) {
      const dto = await mockStore.getQuiz(lectureId);
      return dto ? mapQuizDtoToDomain(dto) : null;
    }

    try {
      const dto = await apiClient<QuizDto>(`/lectures/${lectureId}/quiz`);
      return mapQuizDtoToDomain(dto);
    } catch {
      return null;
    }
  },
};
