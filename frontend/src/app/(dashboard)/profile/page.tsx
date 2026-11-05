import React from "react";
import { PageHeader } from "@/components/shared/page-header";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

export default function ProfilePage() {
  return (
    <div className="space-y-6 max-w-2xl">
      <PageHeader
        title="Student Profile"
        description="View your user identity and academic account details."
      />

      <Card className="p-6 space-y-6">
        <div className="flex items-center gap-4">
          <Avatar className="h-16 w-16">
            <AvatarFallback className="text-lg">AS</AvatarFallback>
          </Avatar>
          <div>
            <h3 className="font-heading font-semibold text-lg">Aman Sharma</h3>
            <p className="font-mono text-xs text-bano-text-subtle">
              student@bano.ai
            </p>
          </div>
        </div>

        <div className="pt-4 border-t border-border font-mono text-xs text-bano-text-muted">
          [M1 Route Skeleton: Profile detail and capability-flagged editing will be implemented in M8]
        </div>
      </Card>
    </div>
  );
}
