import React from "react";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { BarChart3 } from "lucide-react";

export default function BenchmarkPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Model Benchmark"
        description="Empirical evaluation of speech recognition models on technical Hinglish lectures."
      />

      <div className="rounded-md bg-bano-surface-sunken p-3 text-xs text-bano-text-muted font-mono">
        [M1 Route Skeleton: Evaluation tables, Recharts visualizations, and audio alignment will be implemented in M7]
      </div>

      <EmptyState
        icon={BarChart3}
        title="No benchmark results yet"
        description="Results appear here once a formal evaluation run has been completed. Benchmark metrics are strictly measured by the backend—never simulated on the client."
      />
    </div>
  );
}
