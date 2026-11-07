import { env } from "@/config/env";
import { apiClient } from "./api-client";
import { mockStore } from "./mock/mock-store";
import { BenchmarkModelResultDto } from "@/types/api/benchmark";
import { BenchmarkModelResult } from "@/types/domain/benchmark";
import { mapBenchmarkModelResultDtoToDomain } from "./adapters/benchmark-adapter";

export const benchmarkService = {
  /**
   * Fetches empirical evaluation benchmark results.
   * Proposed contract: GET /api/v1/benchmark/results
   */
  async getResults(): Promise<BenchmarkModelResult[]> {
    if (env.USE_MOCK_API) {
      const dtos = (await mockStore.getBenchmarkResults()) as BenchmarkModelResultDto[];
      return (dtos || []).map(mapBenchmarkModelResultDtoToDomain);
    }

    const dtos = await apiClient<BenchmarkModelResultDto[]>("/benchmark/results");
    return (dtos || []).map(mapBenchmarkModelResultDtoToDomain);
  },
};
