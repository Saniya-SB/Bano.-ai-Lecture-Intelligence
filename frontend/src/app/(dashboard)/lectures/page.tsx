"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { StatusBadge } from "@/components/shared/status-badge";
import { DurationText } from "@/components/shared/duration-text";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { SkeletonTable } from "@/components/shared/skeleton-blocks";
import { useLectures } from "@/hooks/use-lectures";
import { ROUTES } from "@/config/routes";
import { LectureStatus } from "@/types/domain/common";
import {
  PlusCircle,
  Search,
  BookOpen,
  ArrowRight,
  FilterX,
  Calendar,
} from "lucide-react";

type FilterStatus = "all" | "completed" | "processing" | "failed";

export default function LecturesPage() {
  const { lectures, isLoading, isError, error, refetch } = useLectures();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<FilterStatus>("all");

  const filteredLectures = useMemo(() => {
    return lectures.filter((lecture) => {
      // Status filter
      if (statusFilter === "completed" && lecture.status !== "completed") return false;
      if (statusFilter === "failed" && lecture.status !== "failed") return false;
      if (
        statusFilter === "processing" &&
        !["processing", "transcribing", "generating_notes", "uploaded"].includes(lecture.status)
      ) {
        return false;
      }

      // Search query filter (title, subject, or topic)
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const matchesTitle = lecture.title.toLowerCase().includes(query);
        const matchesSubject = lecture.subject.toLowerCase().includes(query);
        const matchesTopic = lecture.topic?.toLowerCase().includes(query) ?? false;
        return matchesTitle || matchesSubject || matchesTopic;
      }

      return true;
    });
  }, [lectures, searchQuery, statusFilter]);

  const filterButtons: { label: string; value: FilterStatus }[] = [
    { label: "All Lectures", value: "all" },
    { label: "Completed", value: "completed" },
    { label: "In Progress", value: "processing" },
    { label: "Failed", value: "failed" },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Lecture History"
        description="Search, filter, and review all your processed Hinglish lectures."
        action={
          <Button asChild className="gap-2">
            <Link href={ROUTES.NEW_LECTURE}>
              <PlusCircle className="h-4 w-4" />
              New Lecture
            </Link>
          </Button>
        }
      />

      {/* Search and Filters Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-bano-text-subtle" />
          <Input
            placeholder="Search by title, subject, or topic..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-card"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {filterButtons.map((btn) => (
            <Button
              key={btn.value}
              variant={statusFilter === btn.value ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setStatusFilter(btn.value)}
              className="text-xs h-8 px-3 shrink-0"
            >
              {btn.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Main Content Area */}
      {isLoading && <SkeletonTable rows={5} />}

      {isError && (
        <ErrorState
          title="Could not load lectures"
          message={error?.message || "Failed to load lecture history. Please try again."}
          onRetry={() => refetch()}
        />
      )}

      {!isLoading && !isError && lectures.length === 0 && (
        <EmptyState
          icon={BookOpen}
          title="No lectures found"
          description="You haven't uploaded any lectures yet. Upload audio or record live in Hinglish to get started."
          action={
            <Button asChild className="gap-2">
              <Link href={ROUTES.NEW_LECTURE}>
                <PlusCircle className="h-4 w-4" />
                Upload New Lecture
              </Link>
            </Button>
          }
        />
      )}

      {!isLoading && !isError && lectures.length > 0 && filteredLectures.length === 0 && (
        <EmptyState
          icon={FilterX}
          title="No matching lectures"
          description="No lectures match your current search or filter criteria. Try clearing your filters."
          action={
            <Button
              variant="outline"
              onClick={() => {
                setSearchQuery("");
                setStatusFilter("all");
              }}
            >
              Reset Filters
            </Button>
          }
        />
      )}

      {!isLoading && !isError && filteredLectures.length > 0 && (
        <Card className="overflow-hidden border border-border">
          <div className="divide-y divide-border">
            {filteredLectures.map((lecture) => {
              const targetHref =
                lecture.status === "completed"
                  ? ROUTES.LECTURE_WORKSPACE(lecture.id)
                  : ROUTES.LECTURE_PROCESSING(lecture.id);

              const formattedDate = new Date(lecture.createdAt).toLocaleDateString("en-IN", {
                day: "numeric",
                month: "short",
                year: "numeric",
              });

              return (
                <div
                  key={lecture.id}
                  className="p-4 sm:px-6 hover:bg-bano-surface-sunken/40 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="space-y-1.5 min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Link
                        href={targetHref}
                        className="font-medium text-base text-foreground hover:text-bano-accent hover:underline truncate"
                      >
                        {lecture.title}
                      </Link>
                    </div>

                    <div className="flex items-center gap-3 text-xs text-bano-text-muted flex-wrap">
                      <span className="font-semibold text-bano-text bg-bano-surface-sunken px-2 py-0.5 rounded">
                        {lecture.subject}
                      </span>
                      {lecture.topic && (
                        <>
                          <span>•</span>
                          <span className="truncate max-w-[240px]">{lecture.topic}</span>
                        </>
                      )}
                      <span>•</span>
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3 text-bano-text-subtle" />
                        <span>{formattedDate}</span>
                      </div>
                      <span>•</span>
                      <DurationText seconds={lecture.durationSeconds} />
                    </div>
                  </div>

                  <div className="flex items-center gap-3 self-start sm:self-center shrink-0">
                    <StatusBadge status={lecture.status as LectureStatus} />
                    <Button asChild size="sm" variant="outline" className="gap-1.5 h-8 text-xs">
                      <Link href={targetHref}>
                        <span>{lecture.status === "completed" ? "Workspace" : "Status"}</span>
                        <ArrowRight className="h-3.5 w-3.5" />
                      </Link>
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}
    </div>
  );
}
