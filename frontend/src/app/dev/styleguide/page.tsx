import React from "react";
import { notFound } from "next/navigation";
import { env } from "@/config/env";
import { PageHeader } from "@/components/shared/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { InlineAlert } from "@/components/shared/inline-alert";
import { DurationText } from "@/components/shared/duration-text";
import { FileSizeText } from "@/components/shared/file-size-text";
import { CopyButton } from "@/components/shared/copy-button";
import { SkeletonCard } from "@/components/shared/skeleton-blocks";
import { ArrowRight, Sparkles } from "lucide-react";

export default function StyleguidePage() {
  if (env.IS_PROD) {
    notFound();
  }

  const tokens = [
    { name: "--bg", hex: "#F6F2E9", role: "Page canvas", contrast: "Base surface" },
    { name: "--surface-sunken", hex: "#EFE9DC", role: "Sidebar, wells, headers", contrast: "Surface" },
    { name: "--card", hex: "#FFFDFA", role: "Cards, inputs, popovers", contrast: "Surface" },
    { name: "--border", hex: "#E8E0D3", role: "Default 1px borders", contrast: "Border" },
    { name: "--border-strong", hex: "#D8CEBD", role: "Input hover, dividers", contrast: "Border" },
    { name: "--text", hex: "#25251F", role: "Headings, primary text", contrast: "14.2:1 (Pass AAA)" },
    { name: "--text-muted", hex: "#6B6A61", role: "Body secondary text", contrast: "4.9:1 (Pass AA)" },
    { name: "--text-subtle", hex: "#77766D", role: "Large/placeholder text", contrast: "4.1:1 (Large/Subtle)" },
    { name: "--accent", hex: "#B85C43", role: "Primary buttons, active tabs", contrast: "4.5:1 (Pass AA)" },
    { name: "--accent-soft", hex: "#F4E3DC", role: "Selected rows, soft badges", contrast: "Accent soft" },
    { name: "--success", hex: "#3F6B4E", role: "Completed status", contrast: "4.6:1 (Pass AA)" },
    { name: "--warning", hex: "#8A5A12", role: "Estimated / caution", contrast: "4.8:1 (Pass AA)" },
    { name: "--danger", hex: "#A33A30", role: "Failed / destructive", contrast: "5.1:1 (Pass AA)" },
    { name: "--info", hex: "#3F5F7A", role: "In-progress status", contrast: "4.9:1 (Pass AA)" },
  ];

  return (
    <div className="container mx-auto max-w-[1200px] px-4 py-12 space-y-12">
      <PageHeader
        title="Bano.ai Design System &amp; Component Specimen"
        description="Warm Minimalist + Modern AI SaaS tokens, typography scale, and components."
      />

      {/* 1. Design Tokens & Contrast Report */}
      <section className="space-y-4">
        <h2 className="text-xl font-heading font-bold text-foreground">
          1. Color Tokens &amp; Contrast Validation
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-3">
          {tokens.map((t) => (
            <Card key={t.name} className="p-3 text-xs space-y-1.5 overflow-hidden">
              <div
                className="h-10 w-full rounded border border-border/50"
                style={{ backgroundColor: t.hex }}
              />
              <p className="font-mono font-semibold text-foreground text-[11px] truncate">
                {t.name}
              </p>
              <p className="font-mono text-bano-text-subtle text-[10px]">{t.hex}</p>
              <p className="text-[10px] text-bano-text-muted leading-tight">{t.role}</p>
              <span className="inline-block px-1 py-0.5 text-[9px] font-mono bg-bano-surface-sunken rounded text-bano-text">
                {t.contrast}
              </span>
            </Card>
          ))}
        </div>
      </section>

      {/* 2. Typography Hierarchy */}
      <section className="space-y-4">
        <h2 className="text-xl font-heading font-bold text-foreground">
          2. Typography Scale
        </h2>
        <Card className="p-6 space-y-6">
          <div className="space-y-1">
            <span className="font-mono text-xs text-bano-text-subtle uppercase">Display (Manrope 800)</span>
            <p className="text-4xl sm:text-5xl font-heading font-extrabold tracking-tight">
              Your Lectures. Your Language. Your Learning.
            </p>
          </div>

          <div className="space-y-1">
            <span className="font-mono text-xs text-bano-text-subtle uppercase">H1 (Manrope 700)</span>
            <h1 className="text-3xl font-heading font-bold">
              Engineering Lecture Intelligence
            </h1>
          </div>

          <div className="space-y-1">
            <span className="font-mono text-xs text-bano-text-subtle uppercase">H2 (Manrope 700)</span>
            <h2 className="text-2xl font-heading font-bold">
              Data Structures &amp; Algorithms Workspace
            </h2>
          </div>

          <div className="space-y-1">
            <span className="font-mono text-xs text-bano-text-subtle uppercase">H3 (Manrope 700)</span>
            <h3 className="text-xl font-heading font-bold">
              Binary Search Tree Properties
            </h3>
          </div>

          <div className="space-y-1">
            <span className="font-mono text-xs text-bano-text-subtle uppercase">Body &amp; Secondary (Inter 400)</span>
            <p className="text-base text-foreground leading-relaxed max-w-2xl">
              Primary body text is high contrast and comfortable for extended reading during lecture revision.
            </p>
            <p className="text-sm text-bano-text-muted leading-relaxed max-w-2xl">
              Secondary body text maintains full WCAG AA compliance (4.9:1) on the warm canvas.
            </p>
          </div>

          <div className="space-y-2 pt-2 border-t border-border">
            <span className="font-mono text-xs text-bano-text-subtle uppercase">
              Devanagari Font (Noto Sans Devanagari) vs Roman Font (Inter)
            </span>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-md bg-bano-surface-sunken">
                <span className="text-xs font-mono text-bano-text-subtle block mb-1">
                  Hindi Devanagari (lang=&quot;hi&quot;)
                </span>
                <p className="font-devanagari text-base leading-loose" lang="hi">
                  आज हम बाइनरी सर्च ट्री के बेसिक कॉन्सेप्ट्स और इंसर्शन ऑपरेशन डिस्कस करेंगे।
                </p>
              </div>
              <div className="p-4 rounded-md bg-bano-surface-sunken">
                <span className="text-xs font-mono text-bano-text-subtle block mb-1">
                  Roman Hinglish (lang=&quot;hi-Latn&quot;)
                </span>
                <p className="font-sans text-base leading-relaxed" lang="hi-Latn">
                  Aaj hum binary search tree ke basic concepts aur insertion operation discuss karenge.
                </p>
              </div>
            </div>
          </div>
        </Card>
      </section>

      {/* 3. Buttons */}
      <section className="space-y-4">
        <h2 className="text-xl font-heading font-bold text-foreground">
          3. Button Variants &amp; States
        </h2>
        <Card className="p-6">
          <div className="flex flex-wrap items-center gap-4">
            <Button size="default">
              Primary Button
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            <Button variant="secondary">
              <Sparkles className="mr-2 h-4 w-4" />
              Secondary Button
            </Button>
            <Button variant="outline">Outline Button</Button>
            <Button variant="ghost">Ghost Button</Button>
            <Button variant="destructive">Destructive</Button>
            <Button disabled>Disabled Button</Button>
          </div>
        </Card>
      </section>

      {/* 4. Form Inputs */}
      <section className="space-y-4">
        <h2 className="text-xl font-heading font-bold text-foreground">
          4. Form Inputs &amp; Focus Rings
        </h2>
        <Card className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-2">
            <Label htmlFor="input-default">Default Input</Label>
            <Input id="input-default" placeholder="e.g. Data Structures" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="input-filled">Prefilled Input</Label>
            <Input id="input-filled" defaultValue="Binary Search Trees" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="input-disabled">Disabled Input</Label>
            <Input id="input-disabled" disabled value="Read-only system value" />
          </div>
        </Card>
      </section>

      {/* 5. Status Badges */}
      <section className="space-y-4">
        <h2 className="text-xl font-heading font-bold text-foreground">
          5. Six Status Badges (Always Icon + Text)
        </h2>
        <Card className="p-6 flex flex-wrap gap-4 items-center">
          <StatusBadge status="uploaded" />
          <StatusBadge status="processing" />
          <StatusBadge status="transcribing" />
          <StatusBadge status="generating_notes" />
          <StatusBadge status="completed" />
          <StatusBadge status="failed" />
        </Card>
      </section>

      {/* 6. Feedback & Utilities */}
      <section className="space-y-4">
        <h2 className="text-xl font-heading font-bold text-foreground">
          6. Feedback &amp; Formatted Utilities
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <InlineAlert variant="info" title="Information Notice">
              Processing Hinglish audio with high acoustic fidelity.
            </InlineAlert>
            <InlineAlert variant="success" title="Success Feedback">
              Lecture notes successfully compiled into 7 structured sections.
            </InlineAlert>
            <InlineAlert variant="warning" title="Estimated Value Notice">
              Benchmark metrics are provisional pending validation.
            </InlineAlert>
            <InlineAlert variant="danger" title="Operation Failed">
              Could not complete audio upload. Connection timed out.
            </InlineAlert>
          </div>

          <Card className="p-6 space-y-4">
            <h3 className="font-heading font-semibold text-base">Utilities</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between items-center py-1 border-b border-border">
                <span className="text-bano-text-muted">Duration (short):</span>
                <DurationText seconds={2840} format="short" />
              </div>
              <div className="flex justify-between items-center py-1 border-b border-border">
                <span className="text-bano-text-muted">Duration (timer):</span>
                <DurationText seconds={2840} format="timer" />
              </div>
              <div className="flex justify-between items-center py-1 border-b border-border">
                <span className="text-bano-text-muted">File Size (24.5 MB):</span>
                <FileSizeText bytes={25690112} />
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="text-bano-text-muted">Copy Button:</span>
                <CopyButton value="Sample Hinglish Lecture Text" />
              </div>
            </div>
          </Card>
        </div>
      </section>

      {/* 7. Empty & Error States */}
      <section className="space-y-4">
        <h2 className="text-xl font-heading font-bold text-foreground">
          7. Empty &amp; Error Standard States
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <EmptyState
            title="No lectures yet"
            description="Upload your first audio recording to generate transcripts and notes."
            action={<Button size="sm">Add Lecture</Button>}
          />
          <ErrorState
            title="Failed to load workspace"
            message="Unable to reach the server. Please check your internet connection."
            onRetry={() => alert("Retry clicked")}
          />
        </div>
      </section>
    </div>
  );
}
