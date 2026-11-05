import React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ROUTES } from "@/config/routes";
import { BRAND } from "@/config/brand";
import { ArrowRight, Sparkles, BookOpen, BarChart3, Palette } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="container mx-auto max-w-[1200px] px-4 py-16 sm:py-24">
      {/* Hero Section Placeholder */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
        <div className="lg:col-span-7 space-y-6">
          <div className="inline-flex items-center gap-2">
            <Badge variant="accent" className="px-3 py-1 text-xs">
              M1 FOUNDATION SKELETON
            </Badge>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-heading font-extrabold tracking-tight text-foreground leading-[1.1]">
            Your Lectures. <br />
            Your Language. <br />
            <span className="text-bano-accent">Your Learning.</span>
          </h1>

          <p className="text-lg sm:text-xl text-bano-text-muted max-w-[52ch] leading-relaxed">
            {BRAND.subheading}
          </p>

          <div className="flex flex-wrap items-center gap-4 pt-2">
            <Button asChild size="lg" className="gap-2">
              <Link href={ROUTES.SIGNUP}>
                Get Started Free
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="secondary" size="lg" className="gap-2">
              <Link href={ROUTES.DEV_STYLEGUIDE}>
                <Palette className="h-4 w-4" />
                Inspect Design System
              </Link>
            </Button>
          </div>
        </div>

        {/* Right Preview Card Specimen */}
        <div className="lg:col-span-5">
          <Card className="p-6 bg-card border-border shadow-md rounded-xl space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <Badge variant="outline" className="font-mono text-[11px]">
                HINGLISH TRANSCRIPT SPECIMEN
              </Badge>
              <span className="text-xs text-bano-text-subtle font-mono">00:12 / 47:20</span>
            </div>

            <div className="space-y-3">
              <div className="rounded-md bg-bano-surface-sunken p-3.5 space-y-1">
                <span className="text-[11px] font-mono uppercase text-bano-text-subtle">
                  Devanagari view (lang=&quot;hi&quot;)
                </span>
                <p className="font-devanagari text-sm text-foreground leading-relaxed" lang="hi">
                  आज हम बाइनरी सर्च ट्री के बारे में बात करेंगे। इंसर्शन ऑपरेशन में टाइम कॉम्प्लेक्सिटी O(log n) होती है।
                </p>
              </div>

              <div className="rounded-md bg-bano-surface-sunken p-3.5 space-y-1">
                <span className="text-[11px] font-mono uppercase text-bano-text-subtle">
                  Roman Hinglish view (lang=&quot;hi-Latn&quot;)
                </span>
                <p className="font-sans text-sm text-foreground leading-relaxed" lang="hi-Latn">
                  Aaj hum binary search tree ke baare mein baat karenge. Insertion operation mein time complexity O(log n) hoti hai.
                </p>
              </div>
            </div>

            <div className="pt-2 flex items-center justify-between text-xs text-bano-text-muted">
              <span className="flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-bano-accent" />
                Real-time Dual Script Sync
              </span>
              <span className="font-mono text-bano-accent font-medium">99.2% Tech Term Accuracy</span>
            </div>
          </Card>
        </div>
      </div>

      {/* Feature Navigation Cards */}
      <div className="mt-20 pt-12 border-t border-border grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-6 hover:border-bano-border-strong transition-colors">
          <BookOpen className="h-6 w-6 text-bano-accent mb-3" />
          <h3 className="font-heading font-semibold text-base mb-1">Lecture Workspace</h3>
          <p className="text-xs text-bano-text-muted mb-4">
            Interactive dual-script transcripts, AI smart notes, summaries, and exam-grade quizzes.
          </p>
          <Button variant="link" asChild className="p-0 h-auto text-xs">
            <Link href={ROUTES.DASHBOARD}>Enter Dashboard &rarr;</Link>
          </Button>
        </Card>

        <Card className="p-6 hover:border-bano-border-strong transition-colors">
          <BarChart3 className="h-6 w-6 text-bano-accent mb-3" />
          <h3 className="font-heading font-semibold text-base mb-1">Model Benchmarking</h3>
          <p className="text-xs text-bano-text-muted mb-4">
            Research-grade evaluation platform comparing WER and CER for Hinglish models.
          </p>
          <Button variant="link" asChild className="p-0 h-auto text-xs">
            <Link href={ROUTES.BENCHMARK}>View Benchmark &rarr;</Link>
          </Button>
        </Card>

        <Card className="p-6 hover:border-bano-border-strong transition-colors">
          <Palette className="h-6 w-6 text-bano-accent mb-3" />
          <h3 className="font-heading font-semibold text-base mb-1">Design System & Tokens</h3>
          <p className="text-xs text-bano-text-muted mb-4">
            Warm Minimalist color palette, typography scale, accessible components, and token contrast report.
          </p>
          <Button variant="link" asChild className="p-0 h-auto text-xs">
            <Link href={ROUTES.DEV_STYLEGUIDE}>Open Styleguide &rarr;</Link>
          </Button>
        </Card>
      </div>
    </div>
  );
}
