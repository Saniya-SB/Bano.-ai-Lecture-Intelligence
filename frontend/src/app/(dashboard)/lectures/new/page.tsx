import React from "react";
import { PageHeader } from "@/components/shared/page-header";
import { Card } from "@/components/ui/card";
import { Upload, Mic, Youtube } from "lucide-react";

export default function NewLecturePage() {
  return (
    <div className="space-y-6 max-w-4xl">
      <PageHeader
        title="Add a Lecture"
        description="Choose how you want to add your lecture for processing."
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-6 text-center border-bano-accent bg-bano-accent-soft/30 space-y-2">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-bano-accent-soft text-bano-accent">
            <Upload className="h-6 w-6" />
          </div>
          <h3 className="font-heading font-semibold text-base">Upload File</h3>
          <p className="text-xs text-bano-text-muted">
            MP3, WAV, M4A, MP4, WEBM
          </p>
        </Card>

        <Card className="p-6 text-center space-y-2 opacity-80">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-bano-surface-sunken text-bano-text">
            <Mic className="h-6 w-6" />
          </div>
          <h3 className="font-heading font-semibold text-base">Record in Browser</h3>
          <p className="text-xs text-bano-text-muted">
            Direct microphone capture
          </p>
        </Card>

        <Card className="p-6 text-center space-y-2 opacity-80">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-bano-surface-sunken text-bano-text">
            <Youtube className="h-6 w-6" />
          </div>
          <h3 className="font-heading font-semibold text-base">YouTube Link</h3>
          <p className="text-xs text-bano-text-muted">
            Permitted captions / audio
          </p>
        </Card>
      </div>

      <Card className="p-8 text-center text-sm text-bano-text-muted font-mono bg-bano-surface-sunken">
        [M1 Route Skeleton: Upload, Audio Recorder, and YouTube flow will be implemented in M4]
      </Card>
    </div>
  );
}
