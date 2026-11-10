"use client";

import React from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ROUTES } from "@/config/routes";
import { usePublicBenchmark } from "@/hooks/use-public-benchmark";
import { MotionReveal } from "@/components/shared/motion-reveal";

/** Inline benchmark widget shown on the landing page — no auth required. */
function BenchmarkWidget() {
  const { data, isLoading } = usePublicBenchmark();

  // Don't show anything while loading or if no data yet (empty DB)
  if (isLoading) {
    return (
      <div className="border border-border rounded-lg bg-card p-5 space-y-3 animate-pulse">
        <div className="h-4 w-40 bg-bano-surface-sunken rounded" />
        <div className="h-16 bg-bano-surface-sunken rounded" />
      </div>
    );
  }

  if (!data || data.models.length === 0) {
    // Empty DB — skip the widget entirely rather than showing "unavailable"
    return null;
  }

  return (
    <div className="border border-border rounded-lg bg-card p-5 space-y-4">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <span className="font-mono text-xs uppercase tracking-widest text-bano-text-subtle">
            Model comparison
          </span>
          <h3 className="font-heading font-semibold text-sm text-foreground mt-0.5">
            Hinglish STT — real benchmark scores
          </h3>
        </div>
        <Link
          href={ROUTES.BENCHMARK}
          className="text-xs text-bano-secondary-ink hover:underline font-medium"
        >
          Full details →
        </Link>
      </div>

      {/* Comparison table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs" role="table">
          <thead>
            <tr className="border-b border-border text-bano-text-subtle">
              <th scope="col" className="pb-2 font-medium pr-4">Model</th>
              <th scope="col" className="pb-2 font-medium text-right pr-4">WER ↓</th>
              <th scope="col" className="pb-2 font-medium text-right pr-4">CER ↓</th>
              <th scope="col" className="pb-2 font-medium text-right pr-4">Term acc ↑</th>
              <th scope="col" className="pb-2 font-medium text-right">Latency</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {data.models.map((m) => (
              <tr key={m.model_name} className="text-foreground">
                <td className="py-2.5 pr-4 font-medium font-mono text-[11px] whitespace-nowrap">
                  {m.model_name}
                </td>
                <td className="py-2.5 pr-4 text-right font-mono whitespace-nowrap">
                  {m.wer !== null ? `${m.wer}%` : <span className="text-bano-text-subtle">—</span>}
                </td>
                <td className="py-2.5 pr-4 text-right font-mono whitespace-nowrap">
                  {m.cer !== null ? `${m.cer}%` : <span className="text-bano-text-subtle">—</span>}
                </td>
                <td className="py-2.5 pr-4 text-right font-mono whitespace-nowrap">
                  {m.technical_term_accuracy !== null
                    ? `${m.technical_term_accuracy}%`
                    : <span className="text-bano-text-subtle">—</span>}
                </td>
                <td className="py-2.5 text-right font-mono whitespace-nowrap">
                  {m.median_latency_sec !== null
                    ? `${m.median_latency_sec}s`
                    : <span className="text-bano-text-subtle">—</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-[11px] text-bano-text-subtle leading-relaxed">
        {data.caveat}{" "}
        {data.clip_count > 0 && `${data.clip_count} clip${data.clip_count !== 1 ? "s" : ""} evaluated.`}
      </p>
    </div>
  );
}

export default function LandingPage() {
  return (
    <div className="container mx-auto max-w-[1040px] px-4 py-12 sm:py-20 space-y-16 sm:space-y-24 scroll-smooth">
      {/* Hero Section */}
      <MotionReveal id="hero" delayMs={50} className="space-y-8 max-w-3xl scroll-mt-24">
        <div className="inline-flex items-center gap-2">
          <Badge variant="accent" className="px-2.5 py-1 text-xs">
            Hinglish Lecture Intelligence
          </Badge>
        </div>

        <div className="space-y-4">
          <h1 className="text-3xl sm:text-5xl font-heading font-bold text-foreground tracking-tight leading-[1.2]">
            Lecture Hinglish mein thi.
            <br />
            Notes ab saaf hain.
          </h1>
          <p className="text-lg sm:text-xl text-bano-text-muted leading-relaxed max-w-2xl">
            Upload ya record karo. Transcript, notes, glossary aur Q&amp;A — ek jagah.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-4 pt-2">
          <Button asChild size="lg" className="gap-2 bg-bano-accent text-white hover:bg-bano-accent-hover font-medium">
            <Link href={ROUTES.NEW_LECTURE}>
              Lecture upload karo
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline" className="gap-2 border-border text-foreground hover:bg-bano-surface-sunken">
            <Link href={ROUTES.LOGIN}>
              Sign in
            </Link>
          </Button>
        </div>
      </MotionReveal>

      {/* Live benchmark widget — public, no auth required */}
      <MotionReveal id="benchmark" delayMs={100} className="scroll-mt-24">
        <BenchmarkWidget />
      </MotionReveal>

      {/* Problem Section: Why Standard STT Fails on Indian Engineering Audio */}
      <MotionReveal id="features" delayMs={100} className="border-t border-border pt-12 space-y-6 scroll-mt-24">
        <h2 className="text-xl sm:text-2xl font-heading font-semibold text-foreground">
          Kyun standard STT engineering lectures pe fail hota hai?
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-sm text-bano-text-muted leading-relaxed">
          <div className="space-y-2">
            <p className="font-semibold text-foreground">Technical code-switching</p>
            <p>
              Classroom mein prof bolte hain:{" "}
              <span className="font-mono text-foreground text-xs bg-bano-surface-sunken px-1.5 py-0.5 rounded">
                &ldquo;Is function mein recursion tab trigger hoga jab base condition false hogi.&rdquo;
              </span>{" "}
              General models isko ya toh pura pure Hindi bana dete hain ya English transliteration tod dete hain.
            </p>
          </div>
          <div className="space-y-2">
            <p className="font-semibold text-foreground">Dual-script accuracy</p>
            <p>
              Exam revision ke liye students ko dono chahiye: Devanagari reading clarity aur Romanized Hinglish search capability. Bano.ai domain terms ko preserve karke notes aur practice questions generate karta hai.
            </p>
          </div>
        </div>
      </MotionReveal>

      {/* Product Flow: 4 Honest Steps */}
      <MotionReveal id="workflow" delayMs={100} className="border-t border-border pt-12 space-y-8 scroll-mt-24">
        <div>
          <span className="font-mono text-xs uppercase tracking-widest text-bano-text-subtle">
            Workflow
          </span>
          <h2 className="text-xl sm:text-2xl font-heading font-semibold text-foreground mt-1">
            Chaar steps: upload se revision tak
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="p-4 rounded-md border border-border bg-card space-y-2 hover:border-bano-border-strong transition-colors">
            <span className="font-mono text-xs font-semibold text-bano-accent">01 · UPLOAD</span>
            <h3 className="font-heading font-semibold text-foreground text-base">Audio ya recording</h3>
            <p className="text-xs text-bano-text-muted leading-relaxed">
              Browser se live lecture record karo ya MP3, WAV, M4A file drop karo.
            </p>
          </div>

          <div className="p-4 rounded-md border border-border bg-card space-y-2 hover:border-bano-border-strong transition-colors">
            <span className="font-mono text-xs font-semibold text-bano-accent">02 · TRANSCRIPT</span>
            <h3 className="font-heading font-semibold text-foreground text-base">Devanagari + Roman</h3>
            <p className="text-xs text-bano-text-muted leading-relaxed">
              Synchronized timestamped transcript. One-click script toggle aur term highlight.
            </p>
          </div>

          <div className="p-4 rounded-md border border-border bg-card space-y-2 hover:border-bano-border-strong transition-colors">
            <span className="font-mono text-xs font-semibold text-bano-accent">03 · NOTES &amp; GLOSSARY</span>
            <h3 className="font-heading font-semibold text-foreground text-base">Structured study material</h3>
            <p className="text-xs text-bano-text-muted leading-relaxed">
              Key concepts, technical glossary, aur summary notes bina hallucination ke.
            </p>
          </div>

          <div className="p-4 rounded-md border border-border bg-card space-y-2 hover:border-bano-border-strong transition-colors">
            <span className="font-mono text-xs font-semibold text-bano-accent">04 · ASK THIS LECTURE</span>
            <h3 className="font-heading font-semibold text-foreground text-base">Grounded Q&amp;A</h3>
            <p className="text-xs text-bano-text-muted leading-relaxed">
              Lecture ke factual content se questions pucho — English, Hindi ya Hinglish mein.
            </p>
          </div>
        </div>
      </MotionReveal>

      {/* Honest Transcript Preview Box */}
      <MotionReveal id="sample" delayMs={100} className="border border-border rounded-lg bg-card p-6 space-y-4 scroll-mt-24">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-[11px] font-mono">
              Sample
            </Badge>
            <span className="text-xs text-bano-text-muted">Data Structures &amp; Algorithms</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-bano-surface-sunken p-3.5 rounded space-y-1.5">
            <span className="text-[10px] font-mono text-bano-text-subtle uppercase">Devanagari Script</span>
            <p className="font-devanagari text-sm text-foreground leading-relaxed">
              आज हम <span className="highlighter-term">recursion</span> समझेंगे। जब एक function खुद को call करता है, तो उसे <span className="highlighter-term">recursive call</span> कहते हैं।
            </p>
          </div>
          <div className="bg-bano-surface-sunken p-3.5 rounded space-y-1.5">
            <span className="text-[10px] font-mono text-bano-text-subtle uppercase">Roman Hinglish Script</span>
            <p className="text-sm text-foreground leading-relaxed">
              Aaj hum <span className="highlighter-term">recursion</span> samjhenge. Jab ek function khud ko call karta hai, toh use <span className="highlighter-term">recursive call</span> kehte hain.
            </p>
          </div>
        </div>

        <p className="text-xs text-bano-text-muted">AI ne banaya — teacher ka exact statement nahi.</p>
      </MotionReveal>

      {/* Bottom CTA */}
      <MotionReveal delayMs={100} className="border-t border-border pt-12 pb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
        <div>
          <h2 className="text-2xl font-heading font-bold text-foreground">
            Apni lecture abhi test karo
          </h2>
          <p className="text-sm text-bano-text-muted mt-1">
            Free dev environment. Kisi card ya credit ki zaroorat nahi.
          </p>
        </div>
        <Button asChild size="lg" className="bg-bano-accent text-white hover:bg-bano-accent-hover font-medium">
          <Link href={ROUTES.NEW_LECTURE}>
            Lecture upload karo
          </Link>
        </Button>
      </MotionReveal>
    </div>
  );
}
