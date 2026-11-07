"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/shared/status-badge";
import { ProcessingStepper } from "@/features/processing/components/processing-stepper";
import { useLectures } from "@/hooks/use-lectures";
import { useJobPolling } from "@/hooks/use-job-polling";
import { ROUTES } from "@/config/routes";
import { FEATURES } from "@/config/features";
import { LectureStatus, JobStage } from "@/types/domain/common";
import { jobService } from "@/services/job-service";
import { toast } from "sonner";
import { RefreshCw, RotateCcw, ArrowLeft, Clock } from "lucide-react";

export default function LectureProcessingPage() {
  const params = useParams<{ id: string }>();
  const lectureId = params?.id ?? "";
  const router = useRouter();

  const { lectures, isLoading: isLecturesLoading, isError: isLecturesError, refetch: refetchLectures } = useLectures();
  const {
    job,
    isLoading: isJobLoading,
    isError: isJobError,
    isTimedOut,
    refetch: refetchJob,
    resetWatchdog,
  } = useJobPolling(lectureId);

  const lecture = lectures.find((item) => item.id === lectureId);

  // If completed, redirect immediately to the workspace
  useEffect(() => {
    if (job?.stage === "completed" || lecture?.status === "completed") {
      toast.success("Lecture processing completed!");
      router.push(`/lectures/${lectureId}?tab=overview`);
    }
  }, [job?.stage, lecture?.status, lectureId, router]);

  const [isRetrying, setIsRetrying] = React.useState(false);

  const handleRetry = async () => {
    if (!lectureId) return;
    try {
      setIsRetrying(true);
      await jobService.retryJob(lectureId);
      toast.success("Processing restarted.");
      resetWatchdog();
      refetchLectures();
      refetchJob();
    } catch {
      toast.error("Failed to retry processing. Please try again.");
    } finally {
      setIsRetrying(false);
    }
  };

  if (isLecturesLoading || isJobLoading) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <PageHeader
          title="Processing Lecture"
          description="Connecting to job status..."
        />
        <Card className="p-8 space-y-6 animate-pulse">
          <div className="h-6 w-1/3 bg-bano-surface-sunken rounded" />
          <div className="space-y-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-8 bg-bano-surface-sunken rounded" />
            ))}
          </div>
        </Card>
      </div>
    );
  }

  if (isLecturesError || isJobError) {
    return (
      <div className="max-w-2xl mx-auto space-y-4">
        <PageHeader
          title="Could Not Load Status"
          description="There was an issue retrieving lecture processing updates."
        />
        <div className="flex gap-3">
          <Button onClick={() => { refetchLectures(); refetchJob(); }} variant="default">
            <RefreshCw className="h-4 w-4 mr-2" /> Try Again
          </Button>
          <Button asChild variant="outline">
            <Link href={ROUTES.LECTURES}>Back to Lecture History</Link>
          </Button>
        </div>
      </div>
    );
  }

  if (!lecture) {
    return (
      <div className="max-w-2xl mx-auto space-y-4">
        <PageHeader
          title="Lecture Not Found"
          description="We couldn't find a lecture with this ID."
        />
        <Button asChild>
          <Link href={ROUTES.LECTURES}>
            <ArrowLeft className="h-4 w-4 mr-2" /> Back to Lecture History
          </Link>
        </Button>
      </div>
    );
  }

  const currentStage: JobStage = job?.stage ?? (lecture.status as unknown as JobStage) ?? "uploading";

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <PageHeader
        title="Processing Lecture"
        description="Live status of your audio transcription and learning material generation."
      />

      <Card className="p-6 space-y-6">
        {/* Header summary */}
        <div className="flex items-center justify-between pb-4 border-b border-border gap-3">
          <div className="min-w-0">
            <h3 className="font-heading font-semibold text-base truncate">
              {lecture.title}
            </h3>
            <p className="text-xs text-bano-text-muted">
              Subject: {lecture.subject}
            </p>
            <p className="text-xs text-bano-text-muted font-mono">
              ID: {lecture.id}
            </p>
          </div>
          <StatusBadge status={lecture.status as LectureStatus} />
        </div>

        {/* Stepper */}
        <ProcessingStepper
          currentStage={currentStage}
          progressPercent={job?.progressPercent}
          errorMessage={job?.errorMessage}
        />

        {/* Timeout Watchdog warning */}
        {isTimedOut && currentStage !== "completed" && currentStage !== "failed" && (
          <div
            role="status"
            className="p-4 rounded-lg bg-bano-accent-soft border border-bano-accent/20 text-bano-accent flex items-start gap-3"
          >
            <Clock className="h-5 w-5 shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-semibold">This is taking longer than expected</p>
              <p className="text-xs text-foreground mt-0.5">
                Large lectures or background processing queues can take a few minutes. You can wait here or check back later from Lecture History.
              </p>
              <div className="mt-3 flex gap-2">
                <Button size="sm" variant="outline" onClick={resetWatchdog}>
                  <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Keep Waiting
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Footer actions */}
        <div className="pt-4 border-t border-border flex flex-wrap items-center justify-between gap-3">
          <Button asChild variant="outline">
            <Link href={ROUTES.LECTURES}>
              <ArrowLeft className="h-4 w-4 mr-2" /> Back to History
            </Link>
          </Button>

          {currentStage === "failed" && FEATURES.processingRetry && (
            <Button
              onClick={handleRetry}
              disabled={isRetrying}
              variant="default"
              className="bg-bano-accent text-white hover:bg-bano-accent-hover"
            >
              <RotateCcw className={`h-4 w-4 mr-2 ${isRetrying ? "animate-spin" : ""}`} />
              {isRetrying ? "Retrying..." : "Retry Processing"}
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
}
