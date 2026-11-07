import React from "react";
import { CheckCircle2, CircleDot, Clock, AlertTriangle } from "lucide-react";
import { JobStage } from "@/types/domain/common";

export interface StageDefinition {
  key: JobStage;
  label: string;
}

export const ORDERED_STAGES: StageDefinition[] = [
  { key: "uploading", label: "Uploading" },
  { key: "validating", label: "Validating" },
  { key: "preparing_audio", label: "Preparing audio" },
  { key: "transcribing", label: "Transcribing Hinglish speech" },
  { key: "processing_transcript", label: "Processing transcript (Devanagari & Roman)" },
  { key: "generating_learning_material", label: "Generating learning material" },
  { key: "completed", label: "Completed" },
];

interface ProcessingStepperProps {
  currentStage: JobStage;
  progressPercent?: number;
  errorMessage?: string;
}

export function ProcessingStepper({
  currentStage,
  progressPercent,
  errorMessage,
}: ProcessingStepperProps) {
  const isFailed = currentStage === "failed";
  const currentIndex = ORDERED_STAGES.findIndex((s) => s.key === currentStage);

  return (
    <div className="space-y-4" role="region" aria-label="Processing Progress">
      {/* Accessible screen-reader live announcement */}
      <div className="sr-only" aria-live="polite">
        {isFailed
          ? `Processing failed: ${errorMessage || "An error occurred."}`
          : currentStage === "completed"
          ? "Lecture processing completed."
          : `Processing stage: ${
              ORDERED_STAGES.find((s) => s.key === currentStage)?.label || currentStage
            }`}
      </div>

      <div className="space-y-3">
        {ORDERED_STAGES.map((stage, idx) => {
          let state: "done" | "active" | "pending" | "failed" = "pending";

          if (isFailed) {
            state = "pending";
          } else if (currentStage === "completed") {
            state = "done";
          } else if (currentIndex === -1) {
            // unknown stage
            state = idx === 0 ? "active" : "pending";
          } else if (idx < currentIndex) {
            state = "done";
          } else if (idx === currentIndex) {
            state = "active";
          } else {
            state = "pending";
          }

          return (
            <div
              key={stage.key}
              className="flex items-center justify-between p-2.5 rounded-lg border border-transparent transition-colors"
            >
              <div className="flex items-center gap-3">
                {state === "done" && (
                  <CheckCircle2
                    className="h-5 w-5 text-bano-success shrink-0"
                    aria-label="Completed"
                  />
                )}
                {state === "active" && (
                  <CircleDot
                    className="h-5 w-5 text-bano-info animate-pulse shrink-0"
                    aria-label="In Progress"
                  />
                )}
                {state === "pending" && (
                  <Clock
                    className="h-5 w-5 text-bano-text-subtle opacity-40 shrink-0"
                    aria-label="Pending"
                  />
                )}

                <span
                  className={`text-sm ${
                    state === "active"
                      ? "font-semibold text-foreground"
                      : state === "done"
                      ? "text-bano-text"
                      : "text-bano-text-subtle"
                  }`}
                >
                  {stage.label}
                </span>
              </div>

              {state === "active" && (
                <div className="text-xs font-mono font-medium text-bano-accent">
                  {typeof progressPercent === "number" ? (
                    <span>{progressPercent}%</span>
                  ) : (
                    <span className="text-bano-text-subtle animate-pulse">Running...</span>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {isFailed && (
        <div
          role="alert"
          className="p-4 rounded-lg bg-bano-danger-soft border border-bano-danger/20 text-bano-danger flex items-start gap-3 mt-4"
        >
          <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-semibold">Processing Failed</p>
            <p className="mt-1 text-xs opacity-90">
              {errorMessage || "An unexpected error occurred while processing your lecture."}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
