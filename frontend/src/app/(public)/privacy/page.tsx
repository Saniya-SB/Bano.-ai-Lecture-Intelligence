import React from "react";
import { PageHeader } from "@/components/shared/page-header";
import { Card } from "@/components/ui/card";

export default function PrivacyPage() {
  return (
    <div className="container mx-auto max-w-[900px] px-4 py-12">
      <PageHeader
        title="Privacy Policy"
        description="How we protect student lecture data and audio recordings."
      />
      <Card className="p-8 space-y-4 text-sm leading-relaxed">
        <h3 className="font-heading font-semibold text-base text-foreground">1. Audio Recording & Data Retention</h3>
        <p className="text-bano-text-muted">
          Your uploaded recordings are stored securely and processed exclusively to generate study transcripts, notes, and quiz materials. Audio files are never transferred to unauthorised third parties.
        </p>
        <h3 className="font-heading font-semibold text-base text-foreground">2. Student Rights & Data Deletion</h3>
        <p className="text-bano-text-muted">
          You retain full ownership of your lecture materials. You can request deletion of your account and associated lecture history at any time through Account Settings.
        </p>
      </Card>
    </div>
  );
}
