import React from "react";
import Link from "next/link";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { SkeletonCard, SkeletonList } from "@/components/shared/skeleton-blocks";
import { ROUTES } from "@/config/routes";
import { PlusCircle, BookOpen, Clock, FileText } from "lucide-react";

export default function DashboardPage() {
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

      {/* 4 Stat Cards Placeholder */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4 flex items-center gap-4">
          <div className="p-2.5 rounded-md bg-bano-accent-soft text-bano-accent">
            <BookOpen className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs text-bano-text-subtle font-medium">Total Lectures</p>
            <p className="text-xl font-heading font-bold text-foreground">6</p>
          </div>
        </Card>

        <Card className="p-4 flex items-center gap-4">
          <div className="p-2.5 rounded-md bg-bano-success-soft text-bano-success">
            <FileText className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs text-bano-text-subtle font-medium">Processed</p>
            <p className="text-xl font-heading font-bold text-foreground">1</p>
          </div>
        </Card>

        <Card className="p-4 flex items-center gap-4">
          <div className="p-2.5 rounded-md bg-bano-info-soft text-bano-info">
            <Clock className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs text-bano-text-subtle font-medium">Audio Time</p>
            <p className="text-xl font-mono font-bold text-foreground">4h 17m</p>
          </div>
        </Card>

        <Card className="p-4 flex items-center gap-4">
          <div className="p-2.5 rounded-md bg-bano-warning-soft text-bano-warning">
            <FileText className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs text-bano-text-subtle font-medium">Notes Generated</p>
            <p className="text-xl font-heading font-bold text-foreground">1</p>
          </div>
        </Card>
      </div>

      {/* Section Grid Placeholder */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-heading font-semibold text-lg">Recent Lectures</h3>
            <Button variant="link" asChild className="text-xs">
              <Link href={ROUTES.LECTURES}>View all</Link>
            </Button>
          </div>
          <SkeletonList count={3} />
        </div>

        <div className="space-y-4">
          <h3 className="font-heading font-semibold text-lg">Quick Actions</h3>
          <SkeletonCard />
        </div>
      </div>
    </div>
  );
}
