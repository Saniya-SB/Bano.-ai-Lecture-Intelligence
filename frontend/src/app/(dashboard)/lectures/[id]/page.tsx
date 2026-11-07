import React, { Suspense, use } from "react";
import { LectureWorkspaceInner } from "@/features/workspace/components/lecture-workspace-inner";

export default function LectureWorkspacePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);

  return (
    <Suspense
      fallback={
        <div className="space-y-6 animate-pulse">
          <div className="h-10 w-1/3 bg-bano-surface-sunken rounded" />
          <div className="h-12 w-full bg-bano-surface-sunken rounded" />
          <div className="h-64 w-full bg-bano-surface-sunken rounded" />
        </div>
      }
    >
      <LectureWorkspaceInner lectureId={resolvedParams.id} />
    </Suspense>
  );
}
