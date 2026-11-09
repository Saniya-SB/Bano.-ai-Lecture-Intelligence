import React from "react";
import { PageHeader } from "@/components/shared/page-header";
import { Card } from "@/components/ui/card";
import { Mail, MessageSquare } from "lucide-react";

export default function ContactPage() {
  return (
    <div className="container mx-auto max-w-[900px] px-4 py-12">
      <PageHeader
        title="Contact & Support"
        description="Have questions or feedback about Bano.ai? Reach out to our engineering team."
      />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="p-6 space-y-3">
          <Mail className="h-6 w-6 text-bano-accent" />
          <h3 className="font-heading font-semibold text-base">Email Support</h3>
          <p className="text-xs text-bano-text-muted">
            For academic partnerships, feedback, or technical queries.
          </p>
          <p className="font-mono text-sm text-foreground">sanbano786786@gmail.com</p>
        </Card>

        <Card className="p-6 space-y-3">
          <MessageSquare className="h-6 w-6 text-bano-accent" />
          <h3 className="font-heading font-semibold text-base">Developer Feedback</h3>
          <p className="text-xs text-bano-text-muted">
            For issues with benchmark evaluation or API integration.
          </p>
          <p className="font-mono text-sm text-foreground">oraza7867@outlook.com</p>
        </Card>
      </div>
    </div>
  );
}
