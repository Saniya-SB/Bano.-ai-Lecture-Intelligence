"use client";

import { useEffect, useState } from "react";
import { env } from "@/config/env";
import type { PublicBenchmarkSummaryDto } from "@/types/api/benchmark-public";

export interface PublicBenchmarkState {
  data: PublicBenchmarkSummaryDto | null;
  isLoading: boolean;
  isError: boolean;
}

/**
 * Fetches the public (no-auth) aggregate benchmark summary.
 * Uses plain fetch with skipAuth so it works on the home page before sign-in.
 * Falls back to null on error — the home page should degrade gracefully.
 */
export function usePublicBenchmark(): PublicBenchmarkState {
  const [state, setState] = useState<PublicBenchmarkState>({
    data: null,
    isLoading: true,
    isError: false,
  });

  useEffect(() => {
    let cancelled = false;
    const baseUrl = (env.API_URL || env.API_BASE_URL).replace(/\/$/, "");
    const url = `${baseUrl}/benchmark/public-summary`;

    async function load() {
      try {
        const res = await fetch(url, {
          headers: { Accept: "application/json" },
          signal: AbortSignal.timeout(8000),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json: PublicBenchmarkSummaryDto = await res.json();
        if (!cancelled) setState({ data: json, isLoading: false, isError: false });
      } catch {
        if (!cancelled) setState({ data: null, isLoading: false, isError: true });
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}

