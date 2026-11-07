"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { quizService } from "@/services/quiz-service";
import { Quiz } from "@/types/domain/materials";

export const quizQueryKeys = {
  detail: (lectureId: string) => ["quiz", lectureId] as const,
};

export function useQuiz(lectureId: string) {
  const queryClient = useQueryClient();

  const query = useQuery<Quiz | null, Error>({
    queryKey: quizQueryKeys.detail(lectureId),
    queryFn: () => quizService.getQuiz(lectureId),
    enabled: Boolean(lectureId),
  });

  const mutation = useMutation<Quiz, Error, number>({
    mutationFn: (numQuestions: number) =>
      quizService.generateQuiz(lectureId, numQuestions),
    onSuccess: (newQuiz) => {
      queryClient.setQueryData(quizQueryKeys.detail(lectureId), newQuiz);
    },
  });

  return {
    quiz: query.data ?? null,
    isLoading: query.isLoading,
    isGenerating: mutation.isPending,
    isError: query.isError || mutation.isError,
    error: query.error || mutation.error,
    generateQuiz: mutation.mutateAsync,
    refetch: query.refetch,
  };
}
