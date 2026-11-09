import { BenchmarkModelResultDto, BenchmarkClipDetailDto } from "@/types/api/benchmark";
import { BenchmarkModelResult, BenchmarkClipDetail } from "@/types/domain/benchmark";

export function mapBenchmarkModelResultDtoToDomain(
  dto: BenchmarkModelResultDto
): BenchmarkModelResult {
  return {
    modelId: dto.model_id,
    modelName: dto.model_name,
    wer: dto.wer ?? null,
    cer: dto.cer ?? null,
    werRoman: dto.wer_roman ?? null,
    cerRoman: dto.cer_roman ?? null,
    technicalTermAccuracy: dto.technical_term_accuracy ?? null,
    meanLatency: dto.mean_latency ?? null,
    minLatency: dto.min_latency ?? null,
    maxLatency: dto.max_latency ?? null,
    totalCost: dto.total_cost ?? null,
    isEstimated: Boolean(dto.is_estimated),
    source: dto.source,
    license: dto.license,
  };
}

export function mapBenchmarkClipDetailDtoToDomain(
  dto: BenchmarkClipDetailDto
): BenchmarkClipDetail {
  return {
    id: dto.id,
    clipId: dto.clip_id,
    modelId: dto.model_id,
    modelName: dto.model_name,
    hypothesisTranscript: dto.hypothesis_transcript,
    hypothesisRoman: dto.hypothesis_roman ?? null,
    referenceTranscript: dto.reference_transcript ?? null,
    referenceRoman: dto.reference_roman ?? null,
    wer: dto.wer,
    cer: dto.cer,
    werRoman: dto.wer_roman ?? null,
    cerRoman: dto.cer_roman ?? null,
    technicalTermAccuracy: dto.technical_term_accuracy,
    codeSwitchScore: dto.code_switch_score ?? null,
    processingTimeSec: dto.processing_time_sec,
    estimatedCostUsd: dto.estimated_cost_usd ?? null,
    isEstimated: Boolean(dto.is_estimated),
    source: dto.source,
    license: dto.license,
    runTimestamp: dto.run_timestamp,
  };
}
