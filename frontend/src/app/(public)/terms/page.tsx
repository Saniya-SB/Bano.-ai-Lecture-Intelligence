import React from "react";
import { PageHeader } from "@/components/shared/page-header";
import { Card } from "@/components/ui/card";

export default function TermsPage() {
  return (
    <div className="container mx-auto max-w-[900px] px-4 py-12">
      <PageHeader
        title="Terms of Service"
        description="Guidelines for using Bano.ai lecture processing services."
      />
      <Card className="p-8 space-y-4 text-sm leading-relaxed">
        <h3 className="font-heading font-semibold text-base text-foreground">1. Permitted Use</h3>
        <p className="text-bano-text-muted">
          Bano.ai is intended for personal and educational use. Only upload or link lectures that you have permission to record or process under applicable academic and institutional guidelines.
        </p>
        <h3 className="font-heading font-semibold text-base text-foreground">2. YouTube & External Sources</h3>
        <p className="text-bano-text-muted">
          Only YouTube lectures with permitted captions or authorised audio sources may be processed. Scraping, unauthorized redistribution, or circumvention of content restrictions is strictly prohibited.
        </p>
      </Card>
    </div>
  );
}
