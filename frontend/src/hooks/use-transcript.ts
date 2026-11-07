"use client";

import { useQuery } from "@tanstack/react-query";
import { transcriptService } from "@/services/transcript-service";
import { Transcript } from "@/types/domain/transcript";

export const transcriptQueryKeys = {
  detail: (lectureId: string) => ["transcript", lectureId] as const,
};

export function useTranscript(lectureId: string) {
  const query = useQuery<Transcript | null, Error>({
    queryKey: transcriptQueryKeys.detail(lectureId),
    queryFn: () => transcriptService.getTranscript(lectureId),
    enabled: Boolean(lectureId),
  });

  return {
    transcript: query.data ?? null,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
}
