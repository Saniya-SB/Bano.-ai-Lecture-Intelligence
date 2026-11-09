import { env } from "@/config/env";
import { apiClient } from "./api-client";
import { mockStore } from "./mock/mock-store";
import { BenchmarkModelResultDto, BenchmarkClipDetailDto } from "@/types/api/benchmark";
import { BenchmarkModelResult, BenchmarkClipDetail } from "@/types/domain/benchmark";
import {
  mapBenchmarkModelResultDtoToDomain,
  mapBenchmarkClipDetailDtoToDomain,
} from "./adapters/benchmark-adapter";

export const benchmarkService = {
  /**
   * Fetches empirical evaluation benchmark results per model.
   * GET /api/v1/benchmark/results
   */
  async getResults(): Promise<BenchmarkModelResult[]> {
    if (env.USE_MOCK_API) {
      const dtos = (await mockStore.getBenchmarkResults()) as BenchmarkModelResultDto[];
      return (dtos || []).map(mapBenchmarkModelResultDtoToDomain);
    }

    const dtos = await apiClient<BenchmarkModelResultDto[]>("/benchmark/results");
    return (dtos || []).map(mapBenchmarkModelResultDtoToDomain);
  },

  /**
   * Fetches granular clip details (reference vs hypothesis) for benchmark evaluation.
   * GET /api/v1/benchmark/details
   */
  async getDetails(): Promise<BenchmarkClipDetail[]> {
    if (env.USE_MOCK_API) {
      return [];
    }

    try {
      const dtos = await apiClient<BenchmarkClipDetailDto[]>("/benchmark/details");
      return (dtos || []).map(mapBenchmarkClipDetailDtoToDomain);
    } catch {
      return [];
    }
  },
};
