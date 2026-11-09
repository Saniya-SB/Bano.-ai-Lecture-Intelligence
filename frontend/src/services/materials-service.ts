import { env } from "@/config/env";
import { apiClient } from "./api-client";
import { mockStore } from "./mock/mock-store";
import { LearningMaterialsDto } from "@/types/api/materials";
import { LearningMaterials } from "@/types/domain/materials";
import { mapLearningMaterialsDtoToDomain } from "./adapters/materials-adapter";

export const materialsService = {
  /**
   * Fetches learning materials (notes, summary, key concepts, glossary, important questions).
   * Proposed contract: GET /api/v1/lectures/{id}/materials
   */
  async getMaterials(lectureId: string): Promise<LearningMaterials | null> {
    if (env.USE_MOCK_API) {
      const dto = await mockStore.getLearningMaterials(lectureId);
      return dto ? mapLearningMaterialsDtoToDomain(dto) : null;
    }

    try {
      const dto = await apiClient<LearningMaterialsDto>(
        `/lectures/${lectureId}/materials`
      );
      return mapLearningMaterialsDtoToDomain(dto);
    } catch {
      return null;
    }
  },

  /**
   * Triggers or retries generation of AI study materials.
   * POST /api/v1/lectures/{id}/generate
   */
  async generateMaterials(lectureId: string, forceRefresh = false): Promise<LearningMaterials> {
    const dto = await apiClient<LearningMaterialsDto>(
      `/lectures/${lectureId}/generate?force_refresh=${forceRefresh}`,
      { method: "POST" }
    );
    return mapLearningMaterialsDtoToDomain(dto);
  },
};
