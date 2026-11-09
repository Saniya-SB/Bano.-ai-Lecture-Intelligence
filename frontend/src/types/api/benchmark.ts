/**
 * Benchmark API DTO Types (snake_case)
 * Matches GET /api/v1/benchmark/results contract exactly.
 * See docs/API_CONTRACT.md § 3.10.
 */

export interface BenchmarkModelResultDto {
  model_id: string;
  model_name: string;
  /** Word Error Rate (ratio, 0–1) for Devanagari/primary script */
  wer: number | null;
  /** Character Error Rate (ratio, 0–1) for Devanagari/primary script */
  cer: number | null;
  /** Word Error Rate (ratio, 0–1) for Roman/Hinglish script */
  wer_roman?: number | null;
  /** Character Error Rate (ratio, 0–1) for Roman/Hinglish script */
  cer_roman?: number | null;
  /** Fraction of technical terms correctly transcribed (0–1) */
  technical_term_accuracy: number | null;
  /** Mean latency in seconds across clips */
  mean_latency?: number | null;
  min_latency?: number | null;
  max_latency?: number | null;
  /** Total cost of benchmark run in USD (0 for free/self-hosted) */
  total_cost?: number | null;
  is_estimated?: boolean;
  /** "empirical" | "estimated" */
  source?: string;
  license?: string;
}

export interface BenchmarkClipDetailDto {
  id: string;
  clip_id: string;
  model_id: string;
  model_name: string;
  hypothesis_transcript: string;
  hypothesis_roman?: string | null;
  reference_transcript?: string | null;
  reference_roman?: string | null;
  wer: number;
  cer: number;
  wer_roman?: number | null;
  cer_roman?: number | null;
  technical_term_accuracy: number;
  code_switch_score?: number | null;
  processing_time_sec: number;
  estimated_cost_usd?: number | null;
  is_estimated: boolean;
  source?: string;
  license?: string;
  run_timestamp?: string;
}
