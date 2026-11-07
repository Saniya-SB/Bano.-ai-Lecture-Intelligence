"use client";

import React, { useState } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { SkeletonTable } from "@/components/shared/skeleton-blocks";
import { useBenchmark } from "@/hooks/use-benchmark";
import { BenchmarkModelResult } from "@/types/domain/benchmark";
import { env } from "@/config/env";
import {
  BarChart3,
  Award,
  Zap,
  DollarSign,
  TrendingUp,
  FlaskConical,
  Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export default function BenchmarkPage() {
  const { results, isLoading, isError, error, refetch } = useBenchmark();
  const [selectedModelId, setSelectedModelId] = useState<string | null>(null);

  // Sample data indicator
  const isSampleScenario = env.USE_MOCK_API && env.MOCK_SCENARIO === "benchmark-sample";

  // Identify best values among available reported metrics (strictly for UI accent, never calculated metrics)
  const bestWer = results.length > 0
    ? results.reduce((min, r) => (r.wer !== null && (min === null || r.wer < min) ? r.wer : min), null as number | null)
    : null;

  const bestCer = results.length > 0
    ? results.reduce((min, r) => (r.cer !== null && (min === null || r.cer < min) ? r.cer : min), null as number | null)
    : null;

  const bestAccuracy = results.length > 0
    ? results.reduce((max, r) => (r.technicalTermAccuracy !== null && (max === null || r.technicalTermAccuracy > max) ? r.technicalTermAccuracy : max), null as number | null)
    : null;

  const fastestTime = results.length > 0
    ? results.reduce((min, r) => (r.processingTimeSec !== null && (min === null || r.processingTimeSec < min) ? r.processingTimeSec : min), null as number | null)
    : null;

  const selectedModel = results.find((r) => r.modelId === selectedModelId) ?? results[0] ?? null;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      <PageHeader
        title="Model Benchmark"
        description="Empirical evaluation of speech recognition models on technical Hinglish lectures."
      />

      {/* Sample mode permanent banner if running under benchmark-sample scenario */}
      {isSampleScenario && (
        <div
          role="status"
          className="rounded-lg border border-bano-accent/30 bg-bano-accent-soft p-4 text-sm text-bano-accent flex items-start gap-3"
        >
          <FlaskConical className="h-5 w-5 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-semibold tracking-wide uppercase text-xs">
              Sample Data – Not Real Results
            </p>
            <p className="text-xs text-foreground/80">
              This benchmark view is rendering mock evaluation records for development and interface verification. Real benchmarks require executed model evaluation runs.
            </p>
          </div>
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <div data-testid="benchmark-loading" className="space-y-4">
          <div className="h-8 w-48 rounded bg-muted animate-pulse" />
          <SkeletonTable rows={4} />
        </div>
      )}

      {/* Error State */}
      {!isLoading && isError && (
        <ErrorState
          title="Benchmark data is unavailable right now"
          message={error?.message || "Could not retrieve model evaluation records. Please check the network connection or retry."}
          onRetry={() => refetch()}
        />
      )}

      {/* Empty State */}
      {!isLoading && !isError && results.length === 0 && (
        <EmptyState
          icon={BarChart3}
          title="No benchmark results yet"
          description="Results appear here once an evaluation run has been completed. Benchmark metrics are strictly measured by the backend—never simulated on the client."
        />
      )}

      {/* Populated Benchmark View */}
      {!isLoading && !isError && results.length > 0 && (
        <div className="space-y-8" data-testid="benchmark-results">
          {/* Key Empirical Summary Highlights */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="rounded-lg border border-border bg-card p-4 space-y-1">
              <div className="flex items-center justify-between text-bano-text-muted text-xs font-medium">
                <span>Lowest Word Error Rate</span>
                <Award className="h-4 w-4 text-bano-accent" />
              </div>
              <div className="text-2xl font-heading font-bold text-foreground">
                {bestWer !== null ? `${bestWer}%` : "Not reported"}
              </div>
              <p className="text-xs text-bano-text-muted">
                Word Error Rate (WER) across Hinglish corpus
              </p>
            </div>

            <div className="rounded-lg border border-border bg-card p-4 space-y-1">
              <div className="flex items-center justify-between text-bano-text-muted text-xs font-medium">
                <span>Highest Tech Accuracy</span>
                <TrendingUp className="h-4 w-4 text-emerald-600" />
              </div>
              <div className="text-2xl font-heading font-bold text-foreground">
                {bestAccuracy !== null ? `${bestAccuracy}%` : "Not reported"}
              </div>
              <p className="text-xs text-bano-text-muted">
                Domain lexicon & terminology precision
              </p>
            </div>

            <div className="rounded-lg border border-border bg-card p-4 space-y-1">
              <div className="flex items-center justify-between text-bano-text-muted text-xs font-medium">
                <span>Fastest Processing</span>
                <Zap className="h-4 w-4 text-amber-600" />
              </div>
              <div className="text-2xl font-heading font-bold text-foreground">
                {fastestTime !== null ? `${fastestTime}s` : "Not reported"}
              </div>
              <p className="text-xs text-bano-text-muted">
                Average transcription latency per lecture hour
              </p>
            </div>

            <div className="rounded-lg border border-border bg-card p-4 space-y-1">
              <div className="flex items-center justify-between text-bano-text-muted text-xs font-medium">
                <span>Evaluated Models</span>
                <BarChart3 className="h-4 w-4 text-blue-600" />
              </div>
              <div className="text-2xl font-heading font-bold text-foreground">
                {results.length}
              </div>
              <p className="text-xs text-bano-text-muted">
                Candidate architectures in current benchmark
              </p>
            </div>
          </div>

          {/* Model Comparison Table */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-heading font-semibold text-foreground">
                  Evaluation Comparison Matrix
                </h2>
                <p className="text-sm text-bano-text-muted">
                  Empirical benchmarks measured on bilingual STEM lecture audio.
                </p>
              </div>
            </div>

            <div className="overflow-x-auto rounded-lg border border-border bg-card shadow-sm">
              <table className="w-full text-left text-sm" role="table">
                <thead className="bg-bano-surface-sunken text-xs font-medium text-bano-text-muted uppercase border-b border-border">
                  <tr>
                    <th scope="col" className="px-4 py-3 sticky left-0 bg-bano-surface-sunken z-10">
                      Model Architecture
                    </th>
                    <th scope="col" className="px-4 py-3 text-right">
                      WER (%)
                    </th>
                    <th scope="col" className="px-4 py-3 text-right">
                      CER (%)
                    </th>
                    <th scope="col" className="px-4 py-3 text-right">
                      Tech Term Accuracy
                    </th>
                    <th scope="col" className="px-4 py-3 text-right">
                      Processing Time
                    </th>
                    <th scope="col" className="px-4 py-3 text-right">
                      Est. Cost / hr
                    </th>
                    <th scope="col" className="px-4 py-3 text-center">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {results.map((model: BenchmarkModelResult) => {
                    const isSelected = selectedModel?.modelId === model.modelId;
                    const isBestWer = model.wer !== null && model.wer === bestWer;
                    const isBestAccuracy = model.technicalTermAccuracy !== null && model.technicalTermAccuracy === bestAccuracy;

                    return (
                      <tr
                        key={model.modelId}
                        className={`hover:bg-muted/50 transition-colors ${
                          isSelected ? "bg-bano-accent-soft/40" : ""
                        }`}
                      >
                        <td className="px-4 py-3.5 font-medium text-foreground sticky left-0 bg-card z-10 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <span>{model.modelName}</span>
                            {model.isEstimated && (
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono bg-amber-100 text-amber-800 border border-amber-300">
                                Estimated
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="px-4 py-3.5 text-right whitespace-nowrap">
                          {model.wer !== null ? (
                            <span className="font-mono inline-flex items-center gap-1.5 justify-end">
                              {model.wer}%
                              {isBestWer && (
                                <span className="text-[10px] bg-bano-accent-soft text-bano-accent px-1.5 py-0.5 rounded font-sans font-medium">
                                  Best
                                </span>
                              )}
                            </span>
                          ) : (
                            <span className="text-bano-text-muted italic text-xs">Not reported</span>
                          )}
                        </td>

                        <td className="px-4 py-3.5 text-right whitespace-nowrap">
                          {model.cer !== null ? (
                            <span className="font-mono">{model.cer}%</span>
                          ) : (
                            <span className="text-bano-text-muted italic text-xs">Not reported</span>
                          )}
                        </td>

                        <td className="px-4 py-3.5 text-right whitespace-nowrap">
                          {model.technicalTermAccuracy !== null ? (
                            <span className="font-mono inline-flex items-center gap-1.5 justify-end">
                              {model.technicalTermAccuracy}%
                              {isBestAccuracy && (
                                <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded font-sans font-medium">
                                  Top
                                </span>
                              )}
                            </span>
                          ) : (
                            <span className="text-bano-text-muted italic text-xs">Not reported</span>
                          )}
                        </td>

                        <td className="px-4 py-3.5 text-right whitespace-nowrap">
                          {model.processingTimeSec !== null ? (
                            <span className="font-mono">{model.processingTimeSec}s</span>
                          ) : (
                            <span className="text-bano-text-muted italic text-xs">Not reported</span>
                          )}
                        </td>

                        <td className="px-4 py-3.5 text-right whitespace-nowrap">
                          {model.estimatedCostUsd !== null ? (
                            <span className="font-mono">${model.estimatedCostUsd.toFixed(2)}</span>
                          ) : (
                            <span className="text-bano-text-muted italic text-xs">Not reported</span>
                          )}
                        </td>

                        <td className="px-4 py-3.5 text-center whitespace-nowrap">
                          <Button
                            variant={isSelected ? "secondary" : "outline"}
                            size="sm"
                            className="text-xs h-7"
                            onClick={() => setSelectedModelId(model.modelId)}
                          >
                            {isSelected ? "Inspecting" : "Inspect"}
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Model Detail Breakdown Card */}
          {selectedModel && (
            <div className="rounded-lg border border-border bg-card p-6 space-y-4 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border pb-4">
                <div>
                  <h3 className="text-base font-heading font-semibold text-foreground">
                    Model Profile: {selectedModel.modelName}
                  </h3>
                  <p className="text-xs text-bano-text-muted font-mono mt-0.5">
                    Identifier: {selectedModel.modelId}
                  </p>
                </div>
                {selectedModel.isEstimated && (
                  <span className="self-start sm:self-auto px-2.5 py-1 rounded text-xs font-medium bg-amber-100 text-amber-800 border border-amber-300">
                    Preliminary / Estimated Metrics
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                <div className="rounded-md bg-bano-surface-sunken p-4 space-y-1">
                  <div className="text-xs text-bano-text-muted font-medium flex items-center gap-1.5">
                    <Award className="h-3.5 w-3.5 text-bano-accent" />
                    Accuracy Profile
                  </div>
                  <div className="text-sm space-y-1 pt-1">
                    <div className="flex justify-between">
                      <span className="text-bano-text-muted">Word Error Rate:</span>
                      <span className="font-mono font-medium">{selectedModel.wer !== null ? `${selectedModel.wer}%` : "Not reported"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-bano-text-muted">Character Error Rate:</span>
                      <span className="font-mono font-medium">{selectedModel.cer !== null ? `${selectedModel.cer}%` : "Not reported"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-bano-text-muted">Tech Term Accuracy:</span>
                      <span className="font-mono font-medium">{selectedModel.technicalTermAccuracy !== null ? `${selectedModel.technicalTermAccuracy}%` : "Not reported"}</span>
                    </div>
                  </div>
                </div>

                <div className="rounded-md bg-bano-surface-sunken p-4 space-y-1">
                  <div className="text-xs text-bano-text-muted font-medium flex items-center gap-1.5">
                    <Zap className="h-3.5 w-3.5 text-amber-600" />
                    Throughput & Latency
                  </div>
                  <div className="text-sm space-y-1 pt-1">
                    <div className="flex justify-between">
                      <span className="text-bano-text-muted">Processing Time:</span>
                      <span className="font-mono font-medium">{selectedModel.processingTimeSec !== null ? `${selectedModel.processingTimeSec}s` : "Not reported"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-bano-text-muted">Real-time Factor:</span>
                      <span className="font-mono font-medium">
                        {selectedModel.processingTimeSec !== null ? `~${(selectedModel.processingTimeSec / 3600).toFixed(3)}x` : "Not reported"}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="rounded-md bg-bano-surface-sunken p-4 space-y-1">
                  <div className="text-xs text-bano-text-muted font-medium flex items-center gap-1.5">
                    <DollarSign className="h-3.5 w-3.5 text-emerald-600" />
                    Cost Metrics
                  </div>
                  <div className="text-sm space-y-1 pt-1">
                    <div className="flex justify-between">
                      <span className="text-bano-text-muted">Cost per Audio Hour:</span>
                      <span className="font-mono font-medium">{selectedModel.estimatedCostUsd !== null ? `$${selectedModel.estimatedCostUsd.toFixed(2)}` : "Not reported"}</span>
                    </div>
                  </div>
                </div>
              </div>

              {selectedModel.notes && (
                <div className="text-xs text-bano-text-muted bg-muted/30 p-3 rounded border border-border flex items-start gap-2">
                  <Info className="h-4 w-4 shrink-0 text-bano-accent mt-0.5" />
                  <span>{selectedModel.notes}</span>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
