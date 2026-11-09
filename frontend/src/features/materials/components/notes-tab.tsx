"use client";

import React, { useState } from "react";
import { LearningMaterials } from "@/types/domain/materials";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, AlertCircle, Download, Loader2 } from "lucide-react";
import { lectureService } from "@/services/lecture-service";
import { toast } from "sonner";

interface NotesTabProps {
  materials: LearningMaterials | null;
  lectureTitle?: string;
  lectureId?: string;
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
}

export function NotesTab({
  materials,
  lectureTitle = "Lecture",
  lectureId,
  isLoading,
  isError,
  onRetry,
}: NotesTabProps) {
  const [isExporting, setIsExporting] = useState(false);

  const handleExportPdf = async () => {
    if (!lectureId || isExporting) return;
    setIsExporting(true);
    try {
      await lectureService.exportNotesPdf(lectureId, lectureTitle);
      toast.success("Notes PDF export ho gaya!");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "PDF export karne mein samasya aayi.");
    } finally {
      setIsExporting(false);
    }
  };
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
      {/* AI disclaimer & Export Button */}
      <div className="p-3 bg-bano-surface-sunken rounded-md border border-border text-xs text-bano-text flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-start gap-2">
          <span className="font-semibold px-1.5 py-0.5 rounded bg-bano-accent/20 text-bano-text text-[11px] shrink-0">
            AI ne banaya, teacher ka exact statement nahi.
          </span>
          <span className="text-bano-text-muted mt-0.5">{materials.disclaimer}</span>
        </div>
        
        {lectureId && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleExportPdf}
            disabled={isExporting}
            className="self-start sm:self-auto shrink-0 gap-1.5 border-border bg-card text-foreground hover:bg-bano-surface-sunken text-xs h-8"
          >
            {isExporting ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Download className="h-3.5 w-3.5 text-bano-accent" />
            )}
            Export notes (PDF)
          </Button>
        )}
      </div>

      {/* Notes list */}
      <div className="space-y-4">
        {materials.notes.map((note, idx) => (
          <Card key={idx} className="p-6 space-y-4">
            <h3 className="font-heading font-semibold text-base text-foreground border-b border-border pb-3">
              {note.heading}
            </h3>

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
