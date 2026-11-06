"use client";

import React from "react";
import Link from "next/link";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { StatusBadge } from "@/components/shared/status-badge";
import { DurationText, formatDuration } from "@/components/shared/duration-text";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { SkeletonList, SkeletonCard } from "@/components/shared/skeleton-blocks";
import { useLectures } from "@/hooks/use-lectures";
import { ROUTES } from "@/config/routes";
import {
  PlusCircle,
  BookOpen,
  Clock,
  CheckCircle2,
  Loader2,
  ArrowRight,
  BarChart3,
  ListFilter,
} from "lucide-react";

export default function DashboardPage() {
  const { lectures, isLoading, isError, error, refetch } = useLectures();

  // Statistics calculation directly from supported lecture data
  const totalLectures = lectures.length;
  const completedLectures = lectures.filter((l) => l.status === "completed").length;
  const inProgressLectures = lectures.filter((l) =>
    ["processing", "transcribing", "generating_notes", "uploaded"].includes(l.status)
  ).length;
  const totalDurationSeconds = lectures.reduce((acc, curr) => acc + (curr.durationSeconds || 0), 0);

  // Recent 4 lectures
  const recentLectures = [...lectures]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 4);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Dashboard"
        description="Welcome back! Ready to turn your Hinglish lectures into knowledge?"
        action={
          <Button asChild className="gap-2">
            <Link href={ROUTES.NEW_LECTURE}>
              <PlusCircle className="h-4 w-4" />
              New Lecture
            </Link>
          </Button>
        }
      />

      {/* 4 Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4 flex items-center gap-4">
          <div className="p-2.5 rounded-md bg-bano-accent-soft text-bano-accent">
            <BookOpen className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs text-bano-text-subtle font-medium">Total Lectures</p>
            <p className="text-xl font-heading font-bold text-foreground">
              {isLoading ? "—" : totalLectures}
            </p>
          </div>
        </Card>

        <Card className="p-4 flex items-center gap-4">
          <div className="p-2.5 rounded-md bg-bano-success-soft text-bano-success">
            <CheckCircle2 className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs text-bano-text-subtle font-medium">Completed</p>
            <p className="text-xl font-heading font-bold text-foreground">
              {isLoading ? "—" : completedLectures}
            </p>
          </div>
        </Card>

        <Card className="p-4 flex items-center gap-4">
          <div className="p-2.5 rounded-md bg-bano-info-soft text-bano-info">
            <Loader2 className={`h-5 w-5 ${inProgressLectures > 0 ? "animate-spin" : ""}`} />
          </div>
          <div>
            <p className="text-xs text-bano-text-subtle font-medium">In Progress</p>
            <p className="text-xl font-heading font-bold text-foreground">
              {isLoading ? "—" : inProgressLectures}
            </p>
          </div>
        </Card>

        <Card className="p-4 flex items-center gap-4">
          <div className="p-2.5 rounded-md bg-bano-warning-soft text-bano-warning">
            <Clock className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs text-bano-text-subtle font-medium">Total Audio Time</p>
            <p className="text-xl font-mono font-bold text-foreground">
              {isLoading ? "—" : formatDuration(totalDurationSeconds, "short")}
            </p>
          </div>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Lectures Column */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-heading font-semibold text-lg text-foreground">Recent Lectures</h3>
            {totalLectures > 0 && (
              <Button variant="link" asChild className="text-xs text-bano-accent hover:underline">
                <Link href={ROUTES.LECTURES}>View all &rarr;</Link>
              </Button>
            )}
          </div>

          {isLoading && <SkeletonList count={3} />}

          {isError && (
            <ErrorState
              title="Unable to load lectures"
              message={error?.message || "An unexpected error occurred while fetching your lectures."}
              onRetry={() => refetch()}
            />
          )}

          {!isLoading && !isError && totalLectures === 0 && (
            <EmptyState
              icon={BookOpen}
              title="No lectures yet"
              description="Upload an audio file or record a Hinglish lecture to generate AI transcripts and study notes."
              action={
                <Button asChild className="gap-2">
                  <Link href={ROUTES.NEW_LECTURE}>
                    <PlusCircle className="h-4 w-4" />
                    Upload First Lecture
                  </Link>
                </Button>
              }
            />
          )}

          {!isLoading && !isError && totalLectures > 0 && (
            <div className="space-y-3">
              {recentLectures.map((lecture) => {
                const targetHref =
                  lecture.status === "completed"
                    ? ROUTES.LECTURE_WORKSPACE(lecture.id)
                    : ROUTES.LECTURE_PROCESSING(lecture.id);

                return (
                  <Card
                    key={lecture.id}
                    className="p-4 transition-colors hover:border-bano-border-strong flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Link
                          href={targetHref}
                          className="font-medium text-foreground hover:text-bano-accent hover:underline truncate"
                        >
                          {lecture.title}
                        </Link>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-bano-text-muted flex-wrap">
                        <span className="font-medium text-bano-text">{lecture.subject}</span>
                        {lecture.topic && (
                          <>
                            <span>•</span>
                            <span className="truncate max-w-[200px]">{lecture.topic}</span>
                          </>
                        )}
                        <span>•</span>
                        <DurationText seconds={lecture.durationSeconds} />
                      </div>
                    </div>

                    <div className="flex items-center gap-3 self-start sm:self-center shrink-0">
                      <StatusBadge status={lecture.status} />
                      <Button asChild size="sm" variant="ghost" className="h-8 px-2 text-xs">
                        <Link href={targetHref} aria-label={`Open ${lecture.title}`}>
                          <ArrowRight className="h-4 w-4" />
                        </Link>
                      </Button>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        {/* Quick Actions Column */}
        <div className="space-y-4">
          <h3 className="font-heading font-semibold text-lg text-foreground">Quick Actions</h3>

          {isLoading ? (
            <SkeletonCard />
          ) : (
            <Card className="p-5 space-y-4">
              <div className="space-y-3">
                <Button asChild variant="outline" className="w-full justify-start gap-2.5 h-11">
                  <Link href={ROUTES.NEW_LECTURE}>
                    <PlusCircle className="h-4 w-4 text-bano-accent" />
                    <span>Upload or Record Lecture</span>
                  </Link>
                </Button>

                <Button asChild variant="outline" className="w-full justify-start gap-2.5 h-11">
                  <Link href={ROUTES.LECTURES}>
                    <ListFilter className="h-4 w-4 text-bano-info" />
                    <span>Lecture History & Filters</span>
                  </Link>
                </Button>

                <Button asChild variant="outline" className="w-full justify-start gap-2.5 h-11">
                  <Link href={ROUTES.BENCHMARK}>
                    <BarChart3 className="h-4 w-4 text-bano-warning" />
                    <span>Hinglish Model Benchmark</span>
                  </Link>
                </Button>
              </div>

              <div className="pt-2 border-t border-border">
                <p className="text-xs text-bano-text-subtle leading-relaxed">
                  Support for Hindi, Romanized Hinglish, and Devanagari dual-script transcription.
                </p>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
