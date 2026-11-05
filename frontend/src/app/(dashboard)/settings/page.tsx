import React from "react";
import { PageHeader } from "@/components/shared/page-header";
import { Card } from "@/components/ui/card";
import { SkeletonCard } from "@/components/shared/skeleton-blocks";

export default function SettingsPage() {
  return (
    <div className="space-y-6 max-w-3xl">
      <PageHeader
        title="Account Settings"
        description="Manage your account preferences, credentials, and data storage."
      />

      <div className="rounded-md bg-bano-surface-sunken p-3 text-xs text-bano-text-muted font-mono">
        [M1 Route Skeleton: Preferences, password update, and data deletion capability flags will be implemented in M8]
      </div>

      <div className="space-y-4">
        <Card className="p-6">
          <h3 className="font-heading font-semibold text-base mb-2">Preferences</h3>
          <p className="text-xs text-bano-text-muted mb-4">
            Default transcript script, notification preferences.
          </p>
          <SkeletonCard />
        </Card>

        <Card className="p-6">
          <h3 className="font-heading font-semibold text-base mb-2">Security &amp; Password</h3>
          <p className="text-xs text-bano-text-muted mb-4">
            Change password (enabled only when supported by backend).
          </p>
          <SkeletonCard />
        </Card>
      </div>
    </div>
  );
}
