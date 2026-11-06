"use client";

import React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/shared/status-badge";
import { useLectures } from "@/hooks/use-lectures";
import { ROUTES } from "@/config/routes";
import { LectureStatus } from "@/types/domain/common";
import { CheckCircle2, CircleDot, Clock } from "lucide-react";

export default function LectureProcessingPage() {
const params = useParams<{ id: string }>();
const lectureId = params.id;

const { lectures, isLoading, isError, refetch } = useLectures();

if (isLoading) {
return <p className="p-6 text-sm text-muted-foreground">Loading lecture...</p>;
}

if (isError) {
return (
<div className="max-w-2xl mx-auto space-y-4">
<p>Could not load lecture details.</p>
<Button onClick={() => refetch()} variant="outline">Try Again</Button>
</div>
);
}

const lecture = lectures.find((item) => item.id === lectureId);

if (!lecture) {
return (
<div className="max-w-2xl mx-auto space-y-4">
<PageHeader
title="Lecture Not Found"
description="We couldn't find a lecture with this ID."
/>
<Button asChild>
<Link href={ROUTES.LECTURES}>Back to Lecture History</Link>
</Button>
</div>
);
}

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
description="Your lecture processing status."
/>

  <Card className="p-6 space-y-6">
    <div className="flex items-center justify-between pb-4 border-b border-border gap-3">
      <div className="min-w-0">
        <h3 className="font-heading font-semibold text-base">
          {lecture.title}
        </h3>
        <p className="text-xs text-bano-text-muted">
          Subject: {lecture.subject}
        </p>
        <p className="text-xs text-bano-text-muted">
          Lecture ID: {lecture.id}
        </p>
      </div>
      <StatusBadge status={lecture.status as LectureStatus} />
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
      Progress stages are currently a static preview. Live processing updates will be implemented in M5.
    </div>

    <Button asChild variant="outline">
      <Link href={ROUTES.LECTURES}>Back to Lecture History</Link>
    </Button>
  </Card>
</div>

);
}