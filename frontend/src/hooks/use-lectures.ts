"use client";

import { useQuery } from "@tanstack/react-query";
import { lectureService } from "@/services/lecture-service";
import { Lecture } from "@/types/domain/common";

export const lectureQueryKeys = {
  all: ["lectures"] as const,
  lists: () => [...lectureQueryKeys.all, "list"] as const,
  detail: (id: string) => [...lectureQueryKeys.all, "detail", id] as const,
};

export function useLectures() {
  const query = useQuery<Lecture[], Error>({
    queryKey: lectureQueryKeys.lists(),
    queryFn: () => lectureService.getLectures(),
  });

  return {
    lectures: query.data ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
}
