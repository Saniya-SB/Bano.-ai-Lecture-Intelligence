import React from "react";
import { PageHeader } from "@/components/shared/page-header";
import { Card } from "@/components/ui/card";
import { BRAND } from "@/config/brand";

export default function AboutPage() {
  return (
    <div className="container mx-auto max-w-[900px] px-4 py-12">
      <PageHeader
        title="About Bano.ai"
        description="Our mission to make engineering education accessible in Indian classrooms."
      />
      <Card className="p-8 space-y-4">
        <p className="text-sm text-bano-text leading-relaxed">
          {BRAND.fullName} is designed specifically for STEM education where professors and students naturally speak Hinglish (a fluid mix of Hindi grammar and English technical terminology).
        </p>
        <p className="text-sm text-bano-text-muted leading-relaxed">
          Standard speech-to-text models fail on technical Hinglish by hallucinating or dropping crucial engineering terms like Fourier transform, binary search trees, and Carnot cycles. Bano.ai bridges this divide with high-precision transcription, smart notes generation, and transparent model evaluation.
        </p>
      </Card>
    </div>
  );
}
