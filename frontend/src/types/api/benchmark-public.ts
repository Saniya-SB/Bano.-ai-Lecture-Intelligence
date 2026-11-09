/** Types for the public (no-auth) benchmark summary endpoint. */

export interface PublicModelSummaryDto {
  model_name: string;
  wer: number | null;
  cer: number | null;
  technical_term_accuracy: number | null;
  median_latency_sec: number | null;
  estimated_cost_usd: number | null;
}

export interface PublicBenchmarkSummaryDto {
  clip_count: number;
  models: PublicModelSummaryDto[];
  caveat: string;
}

