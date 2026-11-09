"use client";

import React, { useState } from "react";
import { LearningMaterials } from "@/types/domain/materials";
import { Card } from "@/components/ui/card";
import {
  HelpCircle,
  AlertCircle,
  FileText,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

interface QuestionsTabProps {
  materials: LearningMaterials | null;
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
}

export function QuestionsTab({
  materials,
  isLoading,
  isError,
  onRetry,
}: QuestionsTabProps) {
  const [expandedIndices, setExpandedIndices] = useState<Record<number, boolean>>({});

  const toggleExpand = (index: number) => {
    setExpandedIndices((prev) => ({
      ...prev,
      [index]: !Boolean(prev[index]),
    }));
  };

  if (isLoading) {
    return (
      <div className="space-y-4 animate-pulse">
        {[...Array(3)].map((_, i) => (
          <Card key={i} className="p-6 space-y-3">
            <div className="h-6 bg-bano-surface-sunken rounded w-2/3" />
            <div className="h-4 bg-bano-surface-sunken rounded w-1/2" />
          </Card>
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <Card className="p-10 text-center space-y-3">
        <AlertCircle className="h-8 w-8 mx-auto text-bano-danger" />
        <h3 className="font-heading font-semibold text-base">Failed to load questions</h3>
        <p className="text-xs text-bano-text-muted">
          Could not retrieve exam and conceptual questions.
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

  if (!materials || materials.importantQuestions.length === 0) {
    return (
      <Card className="p-12 text-center space-y-3">
        <FileText className="h-10 w-10 mx-auto text-bano-text-subtle opacity-50" />
        <h3 className="font-heading font-semibold text-base">No questions available</h3>
        <p className="text-xs text-bano-text-muted max-w-sm mx-auto">
          Exam and conceptual questions are extracted once lecture processing completes.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Disclaimer */}
      <div className="p-3 bg-bano-surface-sunken rounded-md border border-border text-xs text-bano-text flex items-start justify-between gap-2">
        <div className="flex items-start gap-2">
          <span className="font-semibold px-1.5 py-0.5 rounded bg-bano-accent/20 text-bano-text text-[11px] shrink-0">
            AI ne banaya, teacher ka exact statement nahi.
          </span>
          <span className="text-bano-text-muted mt-0.5">{materials.disclaimer}</span>
        </div>
        {materials.modelName && (
          <span className="text-[10px] font-mono text-bano-text-muted shrink-0 mt-0.5">
            Model: {materials.modelName}
          </span>
        )}
      </div>

      {/* Questions List */}
      <div className="space-y-4">
        {materials.importantQuestions.map((item, idx) => {
          const isExpanded = Boolean(expandedIndices[idx]);

          return (
            <Card key={idx} className="p-6 space-y-3 transition-colors">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3 flex-1">
                  <span className="font-heading font-bold text-sm text-bano-accent mt-0.5 select-none">
                    Q{idx + 1}.
                  </span>
                  <h3 className="font-heading font-semibold text-sm sm:text-base text-foreground leading-snug flex-1">
                    {item.question}
                  </h3>
                </div>

                <button
                  type="button"
                  onClick={() => toggleExpand(idx)}
                  className="p-1 rounded text-bano-text-subtle hover:text-foreground hover:bg-bano-surface-sunken transition-colors"
                  aria-label={isExpanded ? "Hide answer" : "Show answer"}
                >
                  <span className="sr-only">{isExpanded ? "Hide answer" : "Show answer"}</span>
                  {isExpanded ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </button>
              </div>

              {/* Answer body */}
              {isExpanded && (
                <div className="pt-3 border-t border-border pl-7">
                  <p className="text-xs font-semibold text-bano-text-subtle uppercase tracking-wider mb-1">
                    Suggested Answer:
                  </p>
                  <p className="text-sm text-foreground/90 leading-relaxed bg-bano-surface-sunken/60 p-3.5 rounded-lg border border-border/60">
                    {item.suggestedAnswer}
                  </p>
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
