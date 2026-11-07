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
};
