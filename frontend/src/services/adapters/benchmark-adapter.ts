import { BenchmarkModelResultDto, BenchmarkRunDto } from "@/types/api/benchmark";
import { BenchmarkModelResult, BenchmarkRun } from "@/types/domain/benchmark";

export function mapBenchmarkModelResultDtoToDomain(
  dto: BenchmarkModelResultDto
): BenchmarkModelResult {
  return {
    modelId: dto.model_id,
    modelName: dto.model_name,
    wer: dto.wer ?? null,
    cer: dto.cer ?? null,
    technicalTermAccuracy: dto.technical_term_accuracy ?? null,
    processingTimeSec: dto.processing_time_sec ?? null,
    estimatedCostUsd: dto.estimated_cost_usd ?? null,
    isEstimated: Boolean(dto.is_estimated),
    notes: dto.notes,
  };
}

export function mapBenchmarkRunDtoToDomain(dto: BenchmarkRunDto): BenchmarkRun {
  return {
    runId: dto.run_id,
    runDate: dto.run_date,
    datasetName: dto.dataset_name,
    audioDurationHours: dto.audio_duration_hours,
    results: (dto.results || []).map(mapBenchmarkModelResultDtoToDomain),
  };
}
