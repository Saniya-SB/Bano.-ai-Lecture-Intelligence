import React from "react";
import Link from "next/link";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { SkeletonTable } from "@/components/shared/skeleton-blocks";
import { ROUTES } from "@/config/routes";
import { PlusCircle } from "lucide-react";

export default function LecturesPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Lecture History"
        description="Search, filter, and review your processed Hinglish lectures."
        action={
          <Button asChild className="gap-2">
            <Link href={ROUTES.NEW_LECTURE}>
              <PlusCircle className="h-4 w-4" />
              New Lecture
            </Link>
          </Button>
        }
      />
      <div className="rounded-md bg-bano-surface-sunken p-3 text-xs text-bano-text-muted font-mono">
        [M1 Route Skeleton: Search, status filters, and table actions will be implemented in M3]
      </div>
      <SkeletonTable rows={5} />
    </div>
  );
}
