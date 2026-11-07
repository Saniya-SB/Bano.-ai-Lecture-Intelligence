"use client";

import React, { useState } from "react";
import { LearningMaterials } from "@/types/domain/materials";
import { Card } from "@/components/ui/card";
import { formatTimestamp } from "@/lib/formatters";
import {
  FileText,
  Clock,
  AlertCircle,
  Sparkles,
  BookMarked,
  BookOpen,
} from "lucide-react";

interface SummaryTabProps {
  materials: LearningMaterials | null;
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
  onTimestampClick?: (seconds: number) => void;
}

export function SummaryTab({
  materials,
  isLoading,
  isError,
  onRetry,
  onTimestampClick,
}: SummaryTabProps) {
  const [summaryMode, setSummaryMode] = useState<"short" | "detailed">("short");

  if (isLoading) {
    return (
      <div className="space-y-4 animate-pulse">
        <Card className="p-6 space-y-3">
          <div className="h-6 bg-bano-surface-sunken rounded w-1/4" />
          <div className="h-4 bg-bano-surface-sunken rounded w-full" />
          <div className="h-4 bg-bano-surface-sunken rounded w-5/6" />
        </Card>
      </div>
    );
  }

  if (isError) {
    return (
      <Card className="p-10 text-center space-y-3">
        <AlertCircle className="h-8 w-8 mx-auto text-bano-danger" />
        <h3 className="font-heading font-semibold text-base">Failed to load summary</h3>
        <p className="text-xs text-bano-text-muted">
          Could not retrieve the lecture summary.
        </p>
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex items-center justify-center px-4 py-2 rounded-md bg-bano-accent text-white text-xs font-medium hover:bg-bano-accent-hover transition-colors"
        >
          Try Again
        </button>
      </Card>
    );
  }

  if (!materials) {
    return (
      <Card className="p-12 text-center space-y-3">
        <FileText className="h-10 w-10 mx-auto text-bano-text-subtle opacity-50" />
        <h3 className="font-heading font-semibold text-base">No summary available yet</h3>
        <p className="text-xs text-bano-text-muted max-w-sm mx-auto">
          Summaries are generated after processing completes.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Disclaimer */}
      <div className="p-3 bg-bano-surface-sunken rounded-lg border border-border text-xs text-bano-text-muted flex items-start gap-2">
        <FileText className="h-4 w-4 text-bano-accent shrink-0 mt-0.5" />
        <span>{materials.disclaimer}</span>
      </div>

      {/* Summary Card with Short / Detailed segmented selector */}
      <Card className="p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-border pb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-bano-accent" />
            <h3 className="font-heading font-semibold text-base">Lecture Summary</h3>
          </div>

          <div
            role="group"
            aria-label="Summary length"
            className="inline-flex items-center rounded-lg bg-bano-surface-sunken p-1 text-xs border border-border self-start sm:self-auto"
          >
            <button
              type="button"
              onClick={() => setSummaryMode("short")}
              className={`px-3 py-1 rounded-md font-medium transition-all ${
                summaryMode === "short"
                  ? "bg-card text-foreground shadow-sm font-semibold"
                  : "text-bano-text-muted hover:text-foreground"
              }`}
            >
              Short Overview
            </button>
            <button
              type="button"
              onClick={() => setSummaryMode("detailed")}
              className={`px-3 py-1 rounded-md font-medium transition-all ${
                summaryMode === "detailed"
                  ? "bg-card text-foreground shadow-sm font-semibold"
                  : "text-bano-text-muted hover:text-foreground"
              }`}
            >
              Detailed Breakdown
            </button>
          </div>
        </div>

        <div className="text-sm text-foreground leading-relaxed">
          {summaryMode === "short" ? (
            <p className="font-medium text-foreground/90">
              {materials.summary.short || "No short summary generated."}
            </p>
          ) : (
            <p className="whitespace-pre-line text-foreground/90">
              {materials.summary.detailed || "No detailed summary generated."}
            </p>
          )}
        </div>
      </Card>

      {/* Key Concepts Section */}
      <Card className="p-6 space-y-4">
        <div className="flex items-center gap-2 border-b border-border pb-3">
          <BookOpen className="h-4 w-4 text-bano-accent" />
          <h3 className="font-heading font-semibold text-base">Key Concepts</h3>
        </div>

        {materials.keyConcepts.length === 0 ? (
          <p className="text-xs text-bano-text-muted">No key concepts identified.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {materials.keyConcepts.map((item, idx) => (
              <div
                key={idx}
                className="p-4 rounded-lg bg-bano-surface-sunken border border-border space-y-2 flex flex-col justify-between"
              >
                <div>
                  <h4 className="font-heading font-semibold text-sm text-foreground">
                    {item.concept}
                  </h4>
                  <p className="text-xs text-bano-text-muted leading-relaxed mt-1">
                    {item.explanation}
                  </p>
                </div>

                {item.referencedTimeRanges && item.referencedTimeRanges.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-border/60">
                    <span className="text-[10px] text-bano-text-subtle flex items-center gap-1">
                      <Clock className="h-2.5 w-2.5" /> At:
                    </span>
                    {item.referencedTimeRanges.map((range, rIdx) => (
                      <button
                        key={rIdx}
                        type="button"
                        onClick={() => onTimestampClick?.(range.start)}
                        className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-card text-bano-accent hover:underline border border-border"
                      >
                        {formatTimestamp(range.start)}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Glossary Section */}
      <Card className="p-6 space-y-4">
        <div className="flex items-center gap-2 border-b border-border pb-3">
          <BookMarked className="h-4 w-4 text-bano-accent" />
          <h3 className="font-heading font-semibold text-base">Technical Glossary</h3>
        </div>

        {materials.glossary.length === 0 ? (
          <p className="text-xs text-bano-text-muted">No glossary terms identified.</p>
        ) : (
          <div className="divide-y divide-border">
            {materials.glossary.map((entry, idx) => (
              <div key={idx} className="py-3 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-1">
                <div className="space-y-0.5">
                  <span className="font-mono font-semibold text-xs text-bano-accent">
                    {entry.term}
                  </span>
                  <p className="text-xs text-foreground/90">
                    {entry.definition}
                  </p>
                </div>

                {entry.referencedTimeRanges && entry.referencedTimeRanges.length > 0 && (
                  <div className="flex items-center gap-1 self-start sm:self-auto shrink-0">
                    {entry.referencedTimeRanges.map((range, rIdx) => (
                      <button
                        key={rIdx}
                        type="button"
                        onClick={() => onTimestampClick?.(range.start)}
                        className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-bano-surface-sunken text-bano-text-subtle hover:text-bano-accent hover:underline border border-border"
                      >
                        {formatTimestamp(range.start)}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
