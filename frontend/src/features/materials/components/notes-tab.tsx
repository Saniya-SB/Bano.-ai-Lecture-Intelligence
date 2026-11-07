"use client";

import React from "react";
import { LearningMaterials } from "@/types/domain/materials";
import { Card } from "@/components/ui/card";
import { formatTimestamp } from "@/lib/formatters";
import { FileText, Clock, AlertCircle } from "lucide-react";

interface NotesTabProps {
  materials: LearningMaterials | null;
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
  onTimestampClick?: (seconds: number) => void;
}

export function NotesTab({
  materials,
  isLoading,
  isError,
  onRetry,
  onTimestampClick,
}: NotesTabProps) {
  if (isLoading) {
    return (
      <div className="space-y-4 animate-pulse">
        {[...Array(3)].map((_, i) => (
          <Card key={i} className="p-6 space-y-3">
            <div className="h-6 bg-bano-surface-sunken rounded w-1/3" />
            <div className="h-4 bg-bano-surface-sunken rounded w-5/6" />
            <div className="h-4 bg-bano-surface-sunken rounded w-4/6" />
          </Card>
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <Card className="p-10 text-center space-y-3">
        <AlertCircle className="h-8 w-8 mx-auto text-bano-danger" />
        <h3 className="font-heading font-semibold text-base">Failed to load lecture notes</h3>
        <p className="text-xs text-bano-text-muted">
          Could not retrieve structured notes for this lecture.
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

  if (!materials || materials.notes.length === 0) {
    return (
      <Card className="p-12 text-center space-y-3">
        <FileText className="h-10 w-10 mx-auto text-bano-text-subtle opacity-50" />
        <h3 className="font-heading font-semibold text-base">No notes available yet</h3>
        <p className="text-xs text-bano-text-muted max-w-sm mx-auto">
          Structured notes are generated once audio processing has completed.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* AI disclaimer */}
      <div className="p-3 bg-bano-surface-sunken rounded-lg border border-border text-xs text-bano-text-muted flex items-start gap-2">
        <FileText className="h-4 w-4 text-bano-accent shrink-0 mt-0.5" />
        <span>{materials.disclaimer}</span>
      </div>

      {/* Notes list */}
      <div className="space-y-4">
        {materials.notes.map((note, idx) => (
          <Card key={idx} className="p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-border pb-3">
              <h3 className="font-heading font-semibold text-base text-foreground">
                {note.heading}
              </h3>

              {/* Timestamp references */}
              {note.referencedTimeRanges && note.referencedTimeRanges.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[11px] text-bano-text-subtle flex items-center gap-1">
                    <Clock className="h-3 w-3" /> Mentioned at:
                  </span>
                  {note.referencedTimeRanges.map((range, rIdx) => (
                    <button
                      key={rIdx}
                      type="button"
                      onClick={() => onTimestampClick?.(range.start)}
                      className="font-mono text-[11px] px-2 py-0.5 rounded bg-bano-surface-sunken text-bano-accent hover:underline border border-border"
                      title="Jump to transcript timestamp"
                    >
                      {formatTimestamp(range.start)} - {formatTimestamp(range.end)}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Bullet points */}
            <ul className="space-y-2 text-sm text-foreground leading-relaxed list-disc list-inside">
              {note.bulletPoints.map((point, pIdx) => (
                <li key={pIdx} className="pl-1">
                  <span className="align-top">{point}</span>
                </li>
              ))}
            </ul>
          </Card>
        ))}
      </div>
    </div>
  );
}
