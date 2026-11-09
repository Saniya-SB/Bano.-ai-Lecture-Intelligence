"use client";

import { useQuery } from "@tanstack/react-query";
import { benchmarkService } from "@/services/benchmark-service";
import { BenchmarkModelResult, BenchmarkClipDetail } from "@/types/domain/benchmark";

export const benchmarkQueryKeys = {
  all: ["benchmark", "results"] as const,
  details: ["benchmark", "details"] as const,
};

export function useBenchmark() {
  const query = useQuery<BenchmarkModelResult[], Error>({
    queryKey: benchmarkQueryKeys.all,
    queryFn: () => benchmarkService.getResults(),
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  const detailsQuery = useQuery<BenchmarkClipDetail[], Error>({
    queryKey: benchmarkQueryKeys.details,
    queryFn: () => benchmarkService.getDetails(),
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  return {
    results: query.data ?? [],
    details: detailsQuery.data ?? [],
    isLoading: query.isLoading || detailsQuery.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: () => {
      query.refetch();
      detailsQuery.refetch();
    },
  };
}
