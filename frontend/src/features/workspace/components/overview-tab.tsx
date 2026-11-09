import React from "react";
import { Lecture } from "@/types/domain/common";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatTimestamp } from "@/lib/formatters";
import {
  FileText,
  ListFilter,
  HelpCircle,
  Award,
  Calendar,
  Clock,
  BookOpen,
} from "lucide-react";

interface OverviewTabProps {
  lecture: Lecture;
  onNavigateTab: (tab: string) => void;
}

export function OverviewTab({ lecture, onNavigateTab }: OverviewTabProps) {
  const isCompleted = lecture.status === "completed";

  return (
    <div className="space-y-6">
      {/* Metadata card */}
      <Card className="p-6">
        <h2 className="text-base font-heading font-semibold text-foreground mb-4">
          Lecture Details
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-md bg-bano-surface-sunken text-bano-text-subtle">
              <BookOpen className="h-4 w-4" />
            </div>
            <div>
              <p className="text-xs text-bano-text-subtle">Subject</p>
              <p className="text-sm font-medium text-foreground">{lecture.subject}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="p-2 rounded-md bg-bano-surface-sunken text-bano-text-subtle">
              <Clock className="h-4 w-4" />
            </div>
            <div>
              <p className="text-xs text-bano-text-subtle">Duration</p>
              <p className="text-sm font-medium font-mono text-foreground">
                {lecture.durationSeconds > 0
                  ? formatTimestamp(lecture.durationSeconds)
                  : "Processing"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="p-2 rounded-md bg-bano-surface-sunken text-bano-text-subtle">
              <Calendar className="h-4 w-4" />
            </div>
            <div>
              <p className="text-xs text-bano-text-subtle">Recorded</p>
              <p className="text-sm font-medium text-foreground">
                {new Date(lecture.createdAt).toLocaleDateString("en-GB", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="p-2 rounded-md bg-bano-surface-sunken text-bano-text-subtle">
              <FileText className="h-4 w-4" />
            </div>
            <div>
              <p className="text-xs text-bano-text-subtle">Topic</p>
              <p className="text-sm font-medium text-foreground truncate">
                {lecture.topic || "General"}
              </p>
            </div>
          </div>
        </div>
      </Card>

      {/* Generated Material Cards (Overview of learning outputs) */}
      <div>
        <h2 className="text-base font-heading font-semibold text-foreground mb-3">
          Learning Material
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Transcript summary */}
          <Card className="p-5 flex flex-col justify-between space-y-4">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-bano-accent uppercase tracking-wider">
                  <FileText className="h-3.5 w-3.5" /> Transcript
                </span>
                <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-bano-success-soft text-bano-success">
                  {isCompleted ? "Available" : "Processing"}
                </span>
              </div>
              <h3 className="font-heading font-semibold text-base">
                Bilingual Hinglish Transcript
              </h3>
              <p className="text-xs text-bano-text-muted leading-relaxed">
                Full lecture transcript synchronized in Devanagari Hindi and Roman Hinglish with segment classification.
              </p>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => onNavigateTab("transcript")}
              className="self-start text-xs"
            >
              Open Transcript &rarr;
            </Button>
          </Card>

          {/* Notes Card */}
          <Card className="p-5 flex flex-col justify-between space-y-4">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-bano-accent uppercase tracking-wider">
                  <ListFilter className="h-3.5 w-3.5" /> Structured Notes
                </span>
                <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-bano-success-soft text-bano-success">
                  {isCompleted ? "Available" : "Processing"}
                </span>
              </div>
              <h3 className="font-heading font-semibold text-base">
                Technical Notes
              </h3>
              <p className="text-xs text-bano-text-muted leading-relaxed">
                Concise bullet points, core properties, and referenced time ranges generated from your lecture.
              </p>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => onNavigateTab("notes")}
              className="self-start text-xs"
            >
              View Notes &rarr;
            </Button>
          </Card>

          {/* Summary Card */}
          <Card className="p-5 flex flex-col justify-between space-y-4">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-bano-secondary-ink uppercase tracking-wider">
                  <BookOpen className="h-3.5 w-3.5" /> Summary &amp; Glossary
                </span>
                <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-bano-success-soft text-bano-success">
                  {isCompleted ? "Available" : "Processing"}
                </span>
              </div>
              <h3 className="font-heading font-semibold text-base">
                Lecture Summaries &amp; Concepts
              </h3>
              <p className="text-xs text-bano-text-muted leading-relaxed">
                Short and detailed breakdowns, key conceptual definitions, and technical terms dictionary.
              </p>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => onNavigateTab("summary")}
              className="self-start text-xs"
            >
              Read Summary &rarr;
            </Button>
          </Card>

          {/* Questions Card */}
          <Card className="p-5 flex flex-col justify-between space-y-4">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-bano-accent uppercase tracking-wider">
                  <HelpCircle className="h-3.5 w-3.5" /> Exam Questions
                </span>
                <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-bano-success-soft text-bano-success">
                  {isCompleted ? "Available" : "Processing"}
                </span>
              </div>
              <h3 className="font-heading font-semibold text-base">
                Important Questions
              </h3>
              <p className="text-xs text-bano-text-muted leading-relaxed">
                Curated exam questions with suggested model answers.
              </p>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => onNavigateTab("questions")}
              className="self-start text-xs"
            >
              Practice Questions &rarr;
            </Button>
          </Card>

          {/* Quiz Card */}
          <Card className="p-5 flex flex-col justify-between space-y-4 md:col-span-2">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-bano-accent uppercase tracking-wider">
                  <Award className="h-3.5 w-3.5" /> Interactive Quiz
                </span>
                <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-bano-accent-soft text-bano-accent">
                  On-Demand
                </span>
              </div>
              <h3 className="font-heading font-semibold text-base">
                AI Knowledge Check
              </h3>
              <p className="text-xs text-bano-text-muted leading-relaxed">
                On-demand customizable MCQ practice quizzes (1 to 15 questions) strictly grounded in core concept segments.
              </p>
            </div>

            <Button
              variant="default"
              size="sm"
              onClick={() => onNavigateTab("quiz")}
              className="self-start text-xs bg-bano-accent hover:bg-bano-accent-hover text-white"
            >
              Take Quiz &rarr;
            </Button>
          </Card>
        </div>
      </div>
    </div>
  );
}
