import React from "react";
import { PageHeader } from "@/components/shared/page-header";
import { Card } from "@/components/ui/card";
import { StatusBadge } from "@/components/shared/status-badge";
import { CheckCircle2, CircleDot, Clock } from "lucide-react";

export default function LectureProcessingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const stages = [
    { name: "Uploading", done: true },
    { name: "Validating", done: true },
    { name: "Preparing audio", done: true },
    { name: "Transcribing Hinglish speech", active: true },
    { name: "Processing transcript (Devanagari & Roman)", pending: true },
    { name: "Generating learning material", pending: true },
    { name: "Completed", pending: true },
  ];

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <PageHeader
        title="Processing Lecture"
        description="Our AI pipeline is transcribing and generating smart study materials."
      />

      <Card className="p-6 space-y-6">
        <div className="flex items-center justify-between pb-4 border-b border-border">
          <div>
            <h3 className="font-heading font-semibold text-base">
              Digital Electronics - Karnaugh Maps
            </h3>
            <p className="text-xs text-bano-text-muted">Job ID: job_103</p>
          </div>
          <StatusBadge status="transcribing" />
        </div>

        <div className="space-y-4">
          {stages.map((stage, idx) => (
            <div key={idx} className="flex items-center gap-3">
              {stage.done ? (
                <CheckCircle2 className="h-5 w-5 text-bano-success" />
              ) : stage.active ? (
                <CircleDot className="h-5 w-5 text-bano-info animate-pulse" />
              ) : (
                <Clock className="h-5 w-5 text-bano-text-subtle opacity-40" />
              )}
              <span
                className={`text-sm ${
                  stage.active
                    ? "font-semibold text-foreground"
                    : stage.done
                    ? "text-bano-text"
                    : "text-bano-text-subtle"
                }`}
              >
                {stage.name}
              </span>
            </div>
          ))}
        </div>

        <div className="pt-4 border-t border-border font-mono text-xs text-bano-text-subtle">
          [M1 Route Skeleton: Dynamic polling and auto-redirect will be implemented in M5]
        </div>
      </Card>
    </div>
  );
}
