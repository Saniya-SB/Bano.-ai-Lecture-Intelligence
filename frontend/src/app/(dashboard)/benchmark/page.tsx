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
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export default function BenchmarkPage() {
  const { results, details, isLoading, isError, error, refetch } = useBenchmark();
  const [selectedModelId, setSelectedModelId] = useState<string | null>(null);

  const isSampleScenario = env.USE_MOCK_API && env.MOCK_SCENARIO === "benchmark-sample";

  const bestWer = results.length > 0
    ? results.reduce((min, r) => (r.wer !== null && (min === null || r.wer < min) ? r.wer : min), null as number | null)
    : null;

  const bestAccuracy = results.length > 0
    ? results.reduce((max, r) => (r.technicalTermAccuracy !== null && (max === null || r.technicalTermAccuracy > max) ? r.technicalTermAccuracy : max), null as number | null)
    : null;

  const fastestLatency = results.length > 0
    ? results.reduce((min, r) => (r.meanLatency != null && (min === null || r.meanLatency < min) ? r.meanLatency : min), null as number | null)
    : null;

  const selectedModel = results.find((r) => r.modelId === selectedModelId) ?? results[0] ?? null;

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      <PageHeader
        title="Model Benchmark"
        description="Technical Hinglish lecture samples pe speech recognition models ka empirical evaluation."
      />

      {/* Mandatory Design Brief Methodology Note & Caveat */}
      <div className="rounded-md border border-bano-border bg-bano-surface-sunken p-4 text-sm text-bano-text space-y-1">
        <div className="flex items-center gap-2 font-semibold text-xs tracking-wider uppercase text-bano-text-subtle">
          <AlertTriangle className="h-4 w-4 text-bano-accent shrink-0" />
          <span>Methodology note &amp; limitation</span>
        </div>
        <p className="text-xs text-bano-text-muted leading-relaxed">
          <strong>3 scripted clips, small test, not a general ranking.</strong> Results reflect measured performance on a specific 30-second STEM curriculum benchmark dataset (Recursion, Binary Search Trees, Database Primary Keys). Backend DB se real runs load hote hain — koi fabricated ya promotional numbers nahi hain.
        </p>
      </div>

      {isSampleScenario && (
        <div
          role="status"
          className="rounded-md border border-bano-accent/30 bg-bano-accent-soft p-4 text-sm text-bano-accent flex items-start gap-3"
        >
          <FlaskConical className="h-5 w-5 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-semibold tracking-wide uppercase text-xs">
              Sample Data – Not Real Results
            </p>
            <p className="text-xs text-foreground/80">
              This benchmark view is rendering mock evaluation records for development and interface verification.
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
          {/* Key Summary Highlights */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="rounded-md border border-border bg-card p-4 space-y-1">
              <div className="flex items-center justify-between text-bano-text-muted text-xs font-medium">
                <span>Lowest WER (Error)</span>
                <Award className="h-4 w-4 text-bano-accent" />
              </div>
              <div className="text-2xl font-mono font-bold text-foreground">
                {bestWer !== null ? `${bestWer}%` : "Not reported"}
              </div>
              <p className="text-xs text-bano-text-muted">
                Word Error Rate across test clips
              </p>
            </div>

            <div className="rounded-md border border-border bg-card p-4 space-y-1">
              <div className="flex items-center justify-between text-bano-text-muted text-xs font-medium">
                <span>Highest Term Accuracy</span>
                <TrendingUp className="h-4 w-4 text-bano-success" />
              </div>
              <div className="text-2xl font-mono font-bold text-foreground">
                {bestAccuracy !== null ? `${bestAccuracy}%` : "Not reported"}
              </div>
              <p className="text-xs text-bano-text-muted">
                Technical jargon preservation
              </p>
            </div>

            <div className="rounded-md border border-border bg-card p-4 space-y-1">
              <div className="flex items-center justify-between text-bano-text-muted text-xs font-medium">
                <span>Fastest Latency</span>
                <Zap className="h-4 w-4 text-bano-warning" />
              </div>
              <div className="text-2xl font-mono font-bold text-foreground">
                {fastestLatency !== null ? `${fastestLatency}s` : "Not reported"}
              </div>
              <p className="text-xs text-bano-text-muted">
                Average audio processing time
              </p>
            </div>

            <div className="rounded-md border border-border bg-card p-4 space-y-1">
              <div className="flex items-center justify-between text-bano-text-muted text-xs font-medium">
                <span>Evaluated Models</span>
                <BarChart3 className="h-4 w-4 text-bano-info" />
              </div>
              <div className="text-2xl font-mono font-bold text-foreground">
                {results.length}
              </div>
              <p className="text-xs text-bano-text-muted">
                Architectures in database
              </p>
            </div>
          </div>

          {/* Model Comparison Table */}
          <div className="space-y-3">
            <h2 className="text-base font-heading font-semibold text-foreground">
              Evaluation Comparison Matrix
            </h2>

            <div className="overflow-x-auto rounded-md border border-border bg-card">
              <table className="w-full text-left text-sm" role="table">
                <thead className="bg-bano-surface-sunken text-xs font-mono uppercase text-bano-text-muted border-b border-border">
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
                      Term Accuracy
                    </th>
                    <th scope="col" className="px-4 py-3 text-right">
                      Latency
                    </th>
                    <th scope="col" className="px-4 py-3 text-right">
                      Cost / hr
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
                        className={`hover:bg-bano-surface-sunken/40 transition-colors ${
                          isSelected ? "bg-bano-accent-soft/30" : ""
                        }`}
                      >
                        <td className="px-4 py-3.5 font-medium text-foreground sticky left-0 bg-card z-10 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <span>{model.modelName}</span>
                            {model.isEstimated && (
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono bg-bano-warning-soft text-bano-warning border border-bano-warning/30">
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
                                <span className="text-[10px] bg-bano-success-soft text-bano-success px-1.5 py-0.5 rounded font-sans font-medium">
                                  Top
                                </span>
                              )}
                            </span>
                          ) : (
                            <span className="text-bano-text-muted italic text-xs">Not reported</span>
                          )}
                        </td>

                        <td className="px-4 py-3.5 text-right whitespace-nowrap">
                          {model.meanLatency != null ? (
                            <span className="font-mono">{model.meanLatency}s</span>
                          ) : (
                            <span className="text-bano-text-muted italic text-xs">Not reported</span>
                          )}
                        </td>

                        <td className="px-4 py-3.5 text-right whitespace-nowrap">
                          {model.totalCost != null ? (
                            <span className="font-mono">${model.totalCost.toFixed(2)}</span>
                          ) : (
                            <span className="text-bano-text-muted italic text-xs">Not reported</span>
                          )}
                        </td>

                        <td className="px-4 py-3.5 text-center whitespace-nowrap">
                          <Button
                            variant={isSelected ? "secondary" : "outline"}
                            size="sm"
                            className="text-xs h-7 border-border"
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

          {/* Model Detail Breakdown */}
          {selectedModel && (
            <div className="rounded-md border border-border bg-card p-6 space-y-4">
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
                  <span className="self-start sm:self-auto px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800 border border-amber-300">
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
                  <div className="text-xs space-y-1 pt-1">
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
                    <Zap className="h-3.5 w-3.5 text-bano-warning" />
                    Processing Latency
                  </div>
                  <div className="text-xs space-y-1 pt-1">
                    <div className="flex justify-between">
                      <span className="text-bano-text-muted">Mean Latency:</span>
                      <span className="font-mono font-medium">{selectedModel.meanLatency != null ? `${selectedModel.meanLatency}s` : "Not reported"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-bano-text-muted">Min / Max Latency:</span>
                      <span className="font-mono font-medium">
                        {selectedModel.minLatency != null && selectedModel.maxLatency != null
                          ? `${selectedModel.minLatency}s – ${selectedModel.maxLatency}s`
                          : "Not reported"}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="rounded-md bg-bano-surface-sunken p-4 space-y-1">
                  <div className="text-xs text-bano-text-muted font-medium flex items-center gap-1.5">
                    <DollarSign className="h-3.5 w-3.5 text-bano-success" />
                    Cost &amp; Hosting
                  </div>
                  <div className="text-xs space-y-1 pt-1">
                    <div className="flex justify-between">
                      <span className="text-bano-text-muted">Run Cost:</span>
                      <span className="font-mono font-medium">{selectedModel.totalCost != null ? `$${selectedModel.totalCost.toFixed(2)}` : "$0.00 (Self-hosted)"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-bano-text-muted">Source:</span>
                      <span className="font-mono font-medium capitalize">{selectedModel.source || "Production STT"}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Granular Per-Clip Reference vs Hypothesis Section */}
          {details.length > 0 && (
            <div className="space-y-4 pt-4 border-t border-border">
              <div>
                <h3 className="text-base font-heading font-semibold text-foreground">
                  Per-Clip Breakdown: Reference vs Hypothesis
                </h3>
                <p className="text-xs text-bano-text-muted">
                  Ground truth reference transcript compared with model transcription output.
                </p>
              </div>

              <div className="space-y-4">
                {details.map((clip) => (
                  <div key={clip.id} className="border border-border rounded-md bg-card p-4 space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-2">
                      <span className="font-mono text-xs font-semibold text-bano-text">
                        {clip.clipId}
                      </span>
                      <div className="flex items-center gap-3 text-xs font-mono">
                        <span>WER: <strong>{clip.wer}%</strong></span>
                        <span>CER: <strong>{clip.cer}%</strong></span>
                        <span>Term Acc: <strong>{clip.technicalTermAccuracy}%</strong></span>
                        <span>Time: <strong>{clip.processingTimeSec}s</strong></span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                      <div className="bg-bano-surface-sunken p-3 rounded space-y-1">
                        <span className="text-[10px] font-mono text-bano-text-subtle uppercase">
                          Reference Ground Truth
                        </span>
                        <p className="font-devanagari text-sm leading-relaxed text-foreground">
                          {clip.referenceTranscript || "Ground truth transcript"}
                        </p>
                      </div>

                      <div className="bg-bano-surface-sunken p-3 rounded space-y-1">
                        <span className="text-[10px] font-mono text-bano-text-subtle uppercase">
                          Model Output (Hypothesis)
                        </span>
                        <p className="font-devanagari text-sm leading-relaxed text-foreground">
                          {clip.hypothesisTranscript}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
