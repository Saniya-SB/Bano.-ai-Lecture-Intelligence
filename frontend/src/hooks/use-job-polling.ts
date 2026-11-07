"use client";

import { useEffect, useState, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { jobService } from "@/services/job-service";
import { Job } from "@/types/domain/common";

export const jobQueryKeys = {
  detail: (lectureId: string) => ["job", lectureId] as const,
};

interface UseJobPollingOptions {
  pollingIntervalMs?: number;
  maxDurationSeconds?: number;
}

export function useJobPolling(
  lectureId: string,
  options: UseJobPollingOptions = {}
) {
  const { pollingIntervalMs = 2500, maxDurationSeconds = 90 } = options;
  const [isTimedOut, setIsTimedOut] = useState(false);
  const startTimeRef = useRef<number>(Date.now());

  const query = useQuery<Job | null, Error>({
    queryKey: jobQueryKeys.detail(lectureId),
    queryFn: () => jobService.getJob(lectureId),
    refetchInterval: (queryData) => {
      const job = queryData.state.data;
      // Stop polling on terminal states
      if (job?.stage === "completed" || job?.stage === "failed") {
        return false;
      }
      // Stop polling if timed out
      if (isTimedOut) {
        return false;
      }
      return pollingIntervalMs;
    },
    // Backoff on errors
    retry: 3,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 10000),
  });

  const job = query.data;

  // Watchdog timer for max duration
  useEffect(() => {
    if (job?.stage === "completed" || job?.stage === "failed") {
      return;
    }

    const interval = setInterval(() => {
      const elapsedSeconds = (Date.now() - startTimeRef.current) / 1000;
      if (elapsedSeconds >= maxDurationSeconds) {
        setIsTimedOut(true);
        clearInterval(interval);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [job?.stage, maxDurationSeconds]);

  const resetWatchdog = () => {
    startTimeRef.current = Date.now();
    setIsTimedOut(false);
    query.refetch();
  };

  return {
    job,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    isTimedOut,
    refetch: query.refetch,
    resetWatchdog,
  };
}
