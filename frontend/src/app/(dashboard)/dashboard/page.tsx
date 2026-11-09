"use client";

import React from "react";
import Link from "next/link";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { StatusBadge } from "@/components/shared/status-badge";
import { DurationText } from "@/components/shared/duration-text";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { SkeletonList } from "@/components/shared/skeleton-blocks";
import { useLectures } from "@/hooks/use-lectures";
import { ROUTES } from "@/config/routes";
import {
  PlusCircle,
  BookOpen,
  ArrowRight,
  HelpCircle,
} from "lucide-react";

export default function DashboardPage() {
  const { lectures, isLoading, isError, error, refetch } = useLectures();

  const totalLectures = lectures.length;

  return (
    <div className="space-y-8 max-w-4xl">
      <PageHeader
        title="Dashboard"
        description="Apne Hinglish lectures ko clean dual-script transcripts, notes aur quiz mein badlo."
        action={
          <Button asChild className="gap-2 bg-bano-accent text-white hover:bg-bano-accent-hover font-medium">
            <Link href={ROUTES.NEW_LECTURE}>
              <PlusCircle className="h-4 w-4" />
              Nayi lecture jodo
            </Link>
          </Button>
        }
      />

      {/* Primary Action Card */}
      <div className="rounded-xl border border-border bg-card p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-base font-heading font-semibold text-foreground">
            Lecture upload ya record karo
          </h2>
          <p className="text-xs text-bano-text-muted max-w-md leading-relaxed">
            Direct mic recording ya audio file (MP3, WAV, M4A, WEBM). Domain terms preserve honge.
          </p>
        </div>
        <Button asChild size="default" className="shrink-0 bg-bano-primary text-white hover:bg-bano-primary/90 font-medium">
          <Link href={ROUTES.NEW_LECTURE}>
            <PlusCircle className="h-4 w-4 mr-1.5" />
            New Lecture
          </Link>
        </Button>
      </div>

      {/* Lectures List with Real Status */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-heading font-semibold text-foreground">
            Meri Lectures ({isLoading ? "…" : totalLectures})
          </h2>
          {totalLectures > 4 && (
            <Link
              href={ROUTES.LECTURES}
              className="text-xs text-bano-secondary-ink hover:underline font-medium"
            >
              Sabhi lectures dekho &rarr;
            </Link>
          )}
        </div>

        {isLoading && <SkeletonList count={3} />}

        {isError && (
          <ErrorState
            title="Lectures load nahi ho paye"
            message={error?.message || "Server se connect karne mein samasya aayi."}
            onRetry={() => refetch()}
          />
        )}

        {!isLoading && !isError && totalLectures === 0 && (
          <EmptyState
            icon={BookOpen}
            title="Abhi koi lecture nahi"
            description="30 second ka audio clip upload ya record karke dekho."
            action={
              <Button asChild className="gap-2 bg-bano-accent text-white hover:bg-bano-accent-hover">
                <Link href={ROUTES.NEW_LECTURE}>
                  <PlusCircle className="h-4 w-4" />
                  Lecture shuru karo
                </Link>
              </Button>
            }
          />
        )}

        {!isLoading && !isError && totalLectures > 0 && (
          <div className="border border-border rounded-lg bg-card overflow-hidden divide-y divide-border">
            {lectures.slice(0, 8).map((lecture) => {
              const targetHref =
                lecture.status === "completed"
                  ? ROUTES.LECTURE_WORKSPACE(lecture.id)
                  : ROUTES.LECTURE_PROCESSING(lecture.id);

              return (
                <div
                  key={lecture.id}
                  className="p-4 hover:bg-bano-surface-sunken/40 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="space-y-1 min-w-0 flex-1">
                    <Link
                      href={targetHref}
                      className="font-medium text-foreground hover:text-bano-accent hover:underline truncate block text-sm"
                    >
                      {lecture.title}
                    </Link>
                    <div className="flex items-center gap-2.5 text-xs text-bano-text-muted flex-wrap">
                      <span className="font-medium text-bano-text bg-bano-surface-sunken px-1.5 py-0.5 rounded text-[11px]">
                        {lecture.subject}
                      </span>
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
                    <Button asChild size="sm" variant="outline" className="h-8 px-2 text-xs border-border">
                      <Link href={targetHref} aria-label={`Open ${lecture.title}`}>
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Home page explanation reminder / quick guide */}
      <Card className="p-5 bg-bano-surface-sunken border border-border space-y-2">
        <div className="flex items-center gap-2 text-xs font-semibold text-bano-secondary-ink uppercase tracking-wider">
          <HelpCircle className="h-3.5 w-3.5" />
          <span>Bano.ai kaise kaam karta hai</span>
        </div>
        <p className="text-xs text-bano-text-muted leading-relaxed">
          Technical Hinglish lectures mein prof Hindi aur English terms mix karte hain (&ldquo;recursion tab trigger hoga jab base condition false hogi&rdquo;). Bano.ai domain terms ko preserve karke synchronized Devanagari aur Roman scripts banata hai, aur hallucination-free study notes generate karta hai.
        </p>
      </Card>
    </div>
  );
}
