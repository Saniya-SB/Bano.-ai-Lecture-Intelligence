"use client";

import { useQuery } from "@tanstack/react-query";
import { materialsService } from "@/services/materials-service";
import { LearningMaterials } from "@/types/domain/materials";

export const materialsQueryKeys = {
  detail: (lectureId: string) => ["materials", lectureId] as const,
};

export function useMaterials(lectureId: string) {
  const query = useQuery<LearningMaterials | null, Error>({
    queryKey: materialsQueryKeys.detail(lectureId),
    queryFn: () => materialsService.getMaterials(lectureId),
    enabled: Boolean(lectureId),
  });

  return {
    materials: query.data ?? null,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
}
