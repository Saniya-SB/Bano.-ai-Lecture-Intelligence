"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useLectures } from "@/hooks/use-lectures";
import { useTranscript } from "@/hooks/use-transcript";
import { useMaterials } from "@/hooks/use-materials";
import { useQuiz } from "@/hooks/use-quiz";
import { StatusBadge } from "@/components/shared/status-badge";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { OverviewTab } from "@/features/workspace/components/overview-tab";
import { TranscriptViewer } from "@/features/transcript/components/transcript-viewer";
import { NotesTab } from "@/features/materials/components/notes-tab";
import { SummaryTab } from "@/features/materials/components/summary-tab";
import { QuestionsTab } from "@/features/materials/components/questions-tab";
import { QuizTab } from "@/features/materials/components/quiz-tab";
import { formatTimestamp } from "@/lib/formatters";
import { ROUTES } from "@/config/routes";
import { LectureStatus } from "@/types/domain/common";
import {
  ArrowLeft,
  AlertCircle,
  FileText,
  Clock,
  RefreshCw,
} from "lucide-react";

export type WorkspaceTab =
  | "overview"
  | "transcript"
  | "notes"
  | "summary"
  | "questions"
  | "quiz";

export const WORKSPACE_TABS: { key: WorkspaceTab; label: string }[] = [
  { key: "overview", label: "Overview" },
  { key: "transcript", label: "Transcript" },
  { key: "notes", label: "Notes" },
  { key: "summary", label: "Summary" },
  { key: "questions", label: "Questions" },
  { key: "quiz", label: "Quiz" },
];

export function LectureWorkspaceInner({ lectureId }: { lectureId: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeTab = (searchParams.get("tab") as WorkspaceTab) || "overview";

  const {
    lectures,
    isLoading: isLecturesLoading,
    isError: isLecturesError,
    refetch: refetchLectures,
  } = useLectures();

  const {
    transcript,
    isLoading: isTranscriptLoading,
    isError: isTranscriptError,
    refetch: refetchTranscript,
  } = useTranscript(lectureId);

  const {
    materials,
    isLoading: isMaterialsLoading,
    isError: isMaterialsError,
    refetch: refetchMaterials,
  } = useMaterials(lectureId);

  const {
    quiz,
    isLoading: isQuizLoading,
    isGenerating: isQuizGenerating,
    isError: isQuizError,
    generateQuiz,
    refetch: refetchQuiz,
  } = useQuiz(lectureId);

  const lecture = lectures.find((l) => l.id === lectureId);

  const handleTabChange = (newTab: string) => {
    router.replace(`/lectures/${lectureId}?tab=${newTab}`);
  };

  const handleTimestampClick = (seconds: number) => {
    handleTabChange("transcript");
    // Could optionally trigger smooth scroll to matching timestamp
  };

  if (isLecturesLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-10 w-1/3 bg-bano-surface-sunken rounded" />
        <div className="h-12 w-full bg-bano-surface-sunken rounded" />
        <div className="h-64 w-full bg-bano-surface-sunken rounded" />
      </div>
    );
  }

  if (isLecturesError) {
    return (
      <div className="max-w-xl mx-auto py-12 text-center space-y-4">
        <AlertCircle className="h-10 w-10 mx-auto text-bano-danger" />
        <h2 className="text-lg font-heading font-semibold">
          Could not load lecture
        </h2>
        <p className="text-sm text-bano-text-muted">
          There was an error retrieving lecture details.
        </p>
        <div className="flex justify-center gap-3">
          <Button onClick={() => refetchLectures()} variant="default">
            <RefreshCw className="h-4 w-4 mr-2" /> Try Again
          </Button>
          <Button asChild variant="outline">
            <Link href={ROUTES.LECTURES}>Back to History</Link>
          </Button>
        </div>
      </div>
    );
  }

  if (!lecture) {
    return (
      <div className="max-w-xl mx-auto py-12 text-center space-y-4">
        <h2 className="text-xl font-heading font-bold">Lecture Not Found</h2>
        <p className="text-sm text-bano-text-muted">
          We could not find a lecture matching ID <code className="font-mono text-xs">{lectureId}</code>.
        </p>
        <Button asChild>
          <Link href={ROUTES.LECTURES}>
            <ArrowLeft className="h-4 w-4 mr-2" /> Back to Lectures
          </Link>
        </Button>
      </div>
    );
  }

  const isCompleted = lecture.status === "completed";

  return (
    <div className="space-y-6">
      {/* Back button */}
      <div>
        <Link
          href={ROUTES.LECTURES}
          className="inline-flex items-center text-xs font-medium text-bano-text-muted hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5 mr-1" /> Back to Lectures
        </Link>
      </div>

      {/* Lecture Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-border">
        <div>
          <div className="flex flex-wrap items-center gap-3 mb-1">
            <h1 className="text-2xl font-heading font-bold text-foreground">
              {lecture.title}
            </h1>
            <StatusBadge status={lecture.status as LectureStatus} />
          </div>
          <p className="text-sm text-bano-text-muted">
            <span>{lecture.subject}</span>
            {lecture.durationSeconds > 0 && (
              <>
                <span className="mx-2">&bull;</span>
                <span className="font-mono">{formatTimestamp(lecture.durationSeconds)}</span>
              </>
            )}
            <span className="mx-2">&bull;</span>
            <span>
              Recorded{" "}
              {new Date(lecture.createdAt).toLocaleDateString("en-GB", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            </span>
          </p>
        </div>
      </div>

      {/* Non-completed Warning Banner */}
      {!isCompleted && (
        <div
          role="alert"
          className="p-4 rounded-lg bg-bano-info-soft border border-bano-info/20 text-bano-info flex items-center justify-between gap-3"
        >
          <div className="flex items-center gap-3 text-sm">
            <Clock className="h-5 w-5 shrink-0 animate-pulse" />
            <div>
              <span className="font-semibold">Lecture is currently {lecture.status}.</span>{" "}
              <span>Some materials may still be processing.</span>
            </div>
          </div>
          <Button asChild size="sm" variant="outline" className="text-xs shrink-0">
            <Link href={`/lectures/${lecture.id}/processing`}>View Live Status</Link>
          </Button>
        </div>
      )}

      {/* Tab Navigation */}
      <div
        role="tablist"
        aria-label="Lecture sections"
        className="flex border-b border-border gap-6 text-sm font-medium text-bano-text-muted overflow-x-auto"
      >
        {WORKSPACE_TABS.map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              role="tab"
              aria-selected={isActive}
              aria-controls={`panel-${tab.key}`}
              id={`tab-${tab.key}`}
              onClick={() => handleTabChange(tab.key)}
              className={`pb-2.5 transition-all whitespace-nowrap cursor-pointer ${
                isActive
                  ? "border-b-2 border-bano-accent text-bano-accent font-semibold"
                  : "hover:text-foreground"
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Panels */}
      <div className="pt-2">
        {activeTab === "overview" && (
          <div role="tabpanel" id="panel-overview" aria-labelledby="tab-overview">
            <OverviewTab lecture={lecture} onNavigateTab={handleTabChange} />
          </div>
        )}

        {activeTab === "transcript" && (
          <div role="tabpanel" id="panel-transcript" aria-labelledby="tab-transcript">
            {isTranscriptLoading ? (
              <Card className="p-8 space-y-4 animate-pulse">
                <div className="h-8 bg-bano-surface-sunken rounded w-1/4" />
                <div className="space-y-3">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="h-12 bg-bano-surface-sunken rounded" />
                  ))}
                </div>
              </Card>
            ) : isTranscriptError ? (
              <Card className="p-8 text-center space-y-3">
                <AlertCircle className="h-8 w-8 mx-auto text-bano-danger" />
                <p className="font-semibold text-sm">Failed to load transcript</p>
                <p className="text-xs text-bano-text-muted">
                  There was a problem retrieving the transcript segments.
                </p>
                <Button size="sm" onClick={() => refetchTranscript()}>
                  Retry
                </Button>
              </Card>
            ) : !transcript || transcript.segments.length === 0 ? (
              <Card className="p-12 text-center space-y-3">
                <FileText className="h-10 w-10 mx-auto text-bano-text-subtle opacity-50" />
                <h3 className="font-heading font-semibold text-base">
                  No transcript available
                </h3>
                <p className="text-xs text-bano-text-muted max-w-sm mx-auto">
                  The transcript for this lecture is not ready yet or is still being processed.
                </p>
                {!isCompleted && (
                  <Button asChild size="sm" variant="outline" className="mt-2 text-xs">
                    <Link href={`/lectures/${lecture.id}/processing`}>
                      Check Processing Status
                    </Link>
                  </Button>
                )}
              </Card>
            ) : (
              <TranscriptViewer transcript={transcript} onTimestampClick={handleTimestampClick} />
            )}
          </div>
        )}

        {activeTab === "notes" && (
          <div role="tabpanel" id="panel-notes" aria-labelledby="tab-notes">
            <NotesTab
              materials={materials}
              isLoading={isMaterialsLoading}
              isError={isMaterialsError}
              onRetry={refetchMaterials}
              onTimestampClick={handleTimestampClick}
            />
          </div>
        )}

        {activeTab === "summary" && (
          <div role="tabpanel" id="panel-summary" aria-labelledby="tab-summary">
            <SummaryTab
              materials={materials}
              isLoading={isMaterialsLoading}
              isError={isMaterialsError}
              onRetry={refetchMaterials}
              onTimestampClick={handleTimestampClick}
            />
          </div>
        )}

        {activeTab === "questions" && (
          <div role="tabpanel" id="panel-questions" aria-labelledby="tab-questions">
            <QuestionsTab
              materials={materials}
              isLoading={isMaterialsLoading}
              isError={isMaterialsError}
              onRetry={refetchMaterials}
              onTimestampClick={handleTimestampClick}
            />
          </div>
        )}

        {activeTab === "quiz" && (
          <div role="tabpanel" id="panel-quiz" aria-labelledby="tab-quiz">
            <QuizTab
              quiz={quiz}
              isLoading={isQuizLoading}
              isGenerating={isQuizGenerating}
              isError={isQuizError}
              onGenerateQuiz={generateQuiz}
              onRetry={refetchQuiz}
              onTimestampClick={handleTimestampClick}
            />
          </div>
        )}
      </div>
    </div>
  );
}
