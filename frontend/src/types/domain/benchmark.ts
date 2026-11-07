/**
 * Benchmark Domain Types (camelCase)
 */

export interface BenchmarkModelResult {
  modelId: string;
  modelName: string;
  wer: number | null; // Word Error Rate (%) - lower is better
  cer: number | null; // Character Error Rate (%) - lower is better
  technicalTermAccuracy: number | null; // (%) - higher is better
  processingTimeSec: number | null; // (seconds)
  estimatedCostUsd: number | null; // ($)
  isEstimated: boolean;
  notes?: string;
}

export interface BenchmarkRun {
  runId?: string;
  runDate?: string;
  datasetName?: string;
  audioDurationHours?: number;
  results: BenchmarkModelResult[];
}
