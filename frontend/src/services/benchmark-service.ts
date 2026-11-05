import { env } from "@/config/env";
import { apiClient } from "./api-client";

export interface BenchmarkModelResultDto {
  model_id: string;
  model_name: string;
  wer: number;
  cer: number;
  technical_term_accuracy: number;
  processing_time_sec: number;
  estimated_cost_usd: number;
  is_estimated: boolean;
}

export const benchmarkService = {
  async getResults(): Promise<BenchmarkModelResultDto[]> {
    if (env.USE_MOCK_API) {
      // By default in mock mode, return empty state unless scenario is benchmark-sample
      if (env.MOCK_SCENARIO !== "benchmark-sample") {
        return [];
      }
      return [
        {
          model_id: "m_whisper_large",
          model_name: "Whisper Large v3 (Hinglish fine-tuned)",
          wer: 14.2,
          cer: 7.8,
          technical_term_accuracy: 91.5,
          processing_time_sec: 142,
          estimated_cost_usd: 0.12,
          is_estimated: false,
        },
        {
          model_id: "m_conformer",
          model_name: "Conformer-CTC Indic",
          wer: 18.7,
          cer: 9.6,
          technical_term_accuracy: 84.0,
          processing_time_sec: 98,
          estimated_cost_usd: 0.08,
          is_estimated: true,
        },
      ];
    }
    return apiClient<BenchmarkModelResultDto[]>("/benchmark/results");
  },
};
