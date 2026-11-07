/**
 * Benchmark API DTO Types (snake_case)
 * Reflects proposed benchmark evaluation metrics contract.
 */

export interface BenchmarkModelResultDto {
  model_id: string;
  model_name: string;
  wer: number | null;
  cer: number | null;
  technical_term_accuracy: number | null;
  processing_time_sec: number | null;
  estimated_cost_usd: number | null;
  is_estimated?: boolean;
  notes?: string;
}

export interface BenchmarkRunDto {
  run_id?: string;
  run_date?: string;
  dataset_name?: string;
  audio_duration_hours?: number;
  results: BenchmarkModelResultDto[];
}
