"use client";

import { useQuery } from "@tanstack/react-query";
import { benchmarkService } from "@/services/benchmark-service";
import { BenchmarkModelResult } from "@/types/domain/benchmark";

export const benchmarkQueryKeys = {
  all: ["benchmark", "results"] as const,
};

export function useBenchmark() {
  const query = useQuery<BenchmarkModelResult[], Error>({
    queryKey: benchmarkQueryKeys.all,
    queryFn: () => benchmarkService.getResults(),
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  return {
    results: query.data ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
}
