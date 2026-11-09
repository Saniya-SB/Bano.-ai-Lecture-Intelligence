/**
 * Benchmark Domain Types (camelCase)
 * Mirrors BenchmarkModelResultDto but converted to camelCase for UI use.
 */

export interface BenchmarkModelResult {
  modelId: string;
  modelName: string;
  /** Word Error Rate (ratio 0–1) — lower is better */
  wer: number | null;
  /** Character Error Rate (ratio 0–1) — lower is better */
  cer: number | null;
  /** Word Error Rate for Roman/Hinglish script */
  werRoman?: number | null;
  /** Character Error Rate for Roman/Hinglish script */
  cerRoman?: number | null;
  /** Fraction of technical terms correctly transcribed (0–1) — higher is better */
  technicalTermAccuracy: number | null;
  /** Mean latency in seconds */
  meanLatency?: number | null;
  minLatency?: number | null;
  maxLatency?: number | null;
  /** Total benchmark run cost in USD */
  totalCost?: number | null;
  isEstimated: boolean;
  source?: string;
  license?: string;
}

export interface BenchmarkClipDetail {
  id: string;
  clipId: string;
  modelId: string;
  modelName: string;
  hypothesisTranscript: string;
  hypothesisRoman?: string | null;
  referenceTranscript?: string | null;
  referenceRoman?: string | null;
  wer: number;
  cer: number;
  werRoman?: number | null;
  cerRoman?: number | null;
  technicalTermAccuracy: number;
  codeSwitchScore?: number | null;
  processingTimeSec: number;
  estimatedCostUsd?: number | null;
  isEstimated: boolean;
  source?: string;
  license?: string;
  runTimestamp?: string;
}

export interface BenchmarkRun {
  runId?: string;
  runDate?: string;
  datasetName?: string;
  audioDurationHours?: number;
  results: BenchmarkModelResult[];
}
