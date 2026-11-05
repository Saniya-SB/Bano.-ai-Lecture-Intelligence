import React from "react";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { Card } from "@/components/ui/card";
import { SkeletonCard } from "@/components/shared/skeleton-blocks";

export default function LectureWorkspacePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-border">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-heading font-bold text-foreground">
              Data Structures - Binary Search Trees
            </h1>
            <StatusBadge status="completed" />
          </div>
          <p className="text-sm text-bano-text-muted">
            Computer Science &bull; 47 mins &bull; Recorded 4 Nov 2026
          </p>
        </div>
      </div>

      <div className="flex border-b border-border gap-6 text-sm font-medium text-bano-text-muted overflow-x-auto">
        <span className="border-b-2 border-bano-accent text-bano-accent pb-2.5 font-semibold">
          Overview
        </span>
        <span className="pb-2.5 hover:text-foreground cursor-pointer">Transcript</span>
        <span className="pb-2.5 hover:text-foreground cursor-pointer">Notes</span>
        <span className="pb-2.5 hover:text-foreground cursor-pointer">Summary</span>
        <span className="pb-2.5 hover:text-foreground cursor-pointer">Questions</span>
        <span className="pb-2.5 hover:text-foreground cursor-pointer">Quiz</span>
      </div>

      <Card className="p-6 bg-bano-surface-sunken font-mono text-xs text-bano-text-muted">
        [M1 Route Skeleton: 6 Workspace tabs and script toggle will be implemented in M5 &amp; M6]
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <SkeletonCard />
        <SkeletonCard />
      </div>
    </div>
  );
}
