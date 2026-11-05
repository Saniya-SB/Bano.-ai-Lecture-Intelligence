import React from "react";
import Link from "next/link";
import {
  Mic,
  FileText,
  AlignLeft,
  BookMarked,
  HelpCircle,
  Brain,
  BarChart3,
  ArrowRight,
  Sparkles,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ROUTES } from "@/config/routes";
import { BRAND } from "@/config/brand";

// ---------------------------------------------------------------------------
// Feature cards data
// ---------------------------------------------------------------------------
const FEATURES = [
  {
    icon: Mic,
    title: "Hinglish Transcription",
    description:
      "Transcribes mixed Hindi-English lecture audio into synchronized text, supporting both Devanagari and Roman scripts.",
  },
  {
    icon: FileText,
    title: "Smart Notes",
    description:
      "Generates structured, topic-organized notes from lecture content so you can review key ideas at a glance.",
  },
  {
    icon: AlignLeft,
    title: "Lecture Summaries",
    description:
      "Produces concise summaries that capture the essential points and narrative of each lecture segment.",
  },
  {
    icon: BookMarked,
    title: "Technical Glossary",
    description:
      "Identifies and defines domain-specific technical terms found in the lecture to build your vocabulary.",
  },
  {
    icon: HelpCircle,
    title: "Important Questions",
    description:
      "Surfaces potential exam and comprehension questions derived directly from lecture material.",
  },
  {
    icon: Brain,
    title: "AI Quizzes",
    description:
      "Creates interactive quizzes to test your understanding of lecture concepts and reinforce learning.",
  },
  {
    icon: BarChart3,
    title: "Model Benchmarking",
    description:
      "Research-grade evaluation platform for comparing speech-recognition models on technical Hinglish audio.",
  },
] as const;

// ---------------------------------------------------------------------------
// How it works steps
// ---------------------------------------------------------------------------
const HOW_IT_WORKS = [
  {
    num: "01",
    title: "Upload or Record",
    description:
      "Upload an existing lecture file or record audio directly in the browser from any supported source.",
  },
  {
    num: "02",
    title: "AI Processing",
    description:
      "The AI pipeline processes the lecture audio and generates transcripts, notes, summaries, and quiz material.",
  },
  {
    num: "03",
    title: "Access & Study",
    description:
      "Browse dual-script transcripts, download notes, test yourself with quizzes, and track your progress.",
  },
] as const;

// ---------------------------------------------------------------------------
// Page (Server Component)
// ---------------------------------------------------------------------------
export default function LandingPage() {
  return (
    <div className="container mx-auto max-w-[1200px] px-4">
      {/* ------------------------------------------------------------------ */}
      {/* HERO                                                                */}
      {/* ------------------------------------------------------------------ */}
      <section className="py-20 sm:py-28 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
        {/* Left column */}
        <div className="lg:col-span-7 space-y-6">
          <div className="inline-flex items-center gap-2">
            <Badge variant="accent" className="px-3 py-1 font-mono text-xs uppercase tracking-widest">
              Hinglish Lecture Intelligence
            </Badge>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-heading font-extrabold tracking-tight text-foreground leading-[1.1]">
            Your Lectures.{" "}
            <br className="hidden sm:block" />
            Your Language.{" "}
            <br className="hidden sm:block" />
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
            <Button asChild size="lg" variant="outline" className="gap-2">
              <a href="#features">
                Explore Features
                <Sparkles className="h-4 w-4" />
              </a>
            </Button>
          </div>
        </div>

        {/* Right column — product preview card */}
        <div className="lg:col-span-5">
          <Card className="p-6 bg-card border-border shadow-md rounded-xl space-y-4">
            {/* Card header */}
            <div className="flex items-center justify-between border-b border-border pb-3">
              <Badge variant="outline" className="font-mono text-[11px] uppercase tracking-wider">
                Hinglish Transcript
              </Badge>
              <span className="text-xs text-bano-text-subtle font-mono">00:12 / 47:20</span>
            </div>

            {/* Dual-script content */}
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

            {/* Card footer — factual items only, no accuracy claims */}
            <div className="pt-2 space-y-2">
              <div className="flex items-center gap-1.5 text-xs text-bano-text-muted">
                <CheckCircle2 className="h-3.5 w-3.5 text-bano-accent shrink-0" />
                Devanagari and Roman script views
              </div>
              <div className="flex items-center gap-1.5 text-xs text-bano-text-muted">
                <CheckCircle2 className="h-3.5 w-3.5 text-bano-accent shrink-0" />
                Timestamped lecture segments
              </div>
              <Separator className="mt-2" />
              {/* Script toggle — visual preview only, clearly non-functional */}
              <p className="text-[11px] font-mono text-bano-text-subtle text-center pt-1">
                ↕ Script view toggle — preview only
              </p>
            </div>
          </Card>
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* FEATURES                                                            */}
      {/* ------------------------------------------------------------------ */}
      <section id="features" className="py-16 sm:py-20 border-t border-border scroll-mt-20">
        <div className="mb-12 text-center space-y-3">
          <span className="font-mono text-xs uppercase tracking-widest text-bano-text-subtle">
            Features
          </span>
          <h2 className="text-3xl sm:text-4xl font-heading font-bold text-foreground">
            Everything your lecture needs
          </h2>
          <p className="text-bano-text-muted max-w-[52ch] mx-auto">
            From raw audio to structured study material — Bano.ai covers every step of the learning journey.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {FEATURES.map(({ icon: Icon, title, description }) => (
            <Card
              key={title}
              className="p-6 hover:border-bano-accent/40 transition-colors duration-200 group"
            >
              <div className="mb-4 inline-flex items-center justify-center rounded-full bg-bano-accent-soft p-2.5">
                <Icon className="h-5 w-5 text-bano-accent" aria-hidden />
              </div>
              <h3 className="mb-2 font-heading font-semibold text-base text-foreground">
                {title}
              </h3>
              <p className="text-sm text-bano-text-muted leading-relaxed">{description}</p>
            </Card>
          ))}
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* HOW IT WORKS                                                        */}
      {/* ------------------------------------------------------------------ */}
      <section id="how-it-works" className="py-16 sm:py-20 border-t border-border scroll-mt-20">
        <div className="mb-12 text-center space-y-3">
          <span className="font-mono text-xs uppercase tracking-widest text-bano-text-subtle">
            How it works
          </span>
          <h2 className="text-3xl sm:text-4xl font-heading font-bold text-foreground">
            Three steps to smarter study
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {HOW_IT_WORKS.map(({ num, title, description }) => (
            <div key={num} className="flex flex-col items-start gap-4">
              <span
                className="font-mono text-5xl font-bold text-bano-surface-sunken select-none leading-none"
                aria-hidden
              >
                {num}
              </span>
              <div>
                <h3 className="mb-2 font-heading font-semibold text-lg text-foreground">
                  {title}
                </h3>
                <p className="text-sm text-bano-text-muted leading-relaxed">{description}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* BENCHMARK                                                           */}
      {/* ------------------------------------------------------------------ */}
      <section id="benchmark" className="py-16 sm:py-20 border-t border-border scroll-mt-20">
        <div className="max-w-2xl mx-auto text-center space-y-6">
          <span className="font-mono text-xs uppercase tracking-widest text-bano-text-subtle">
            Research
          </span>
          <h2 className="text-3xl sm:text-4xl font-heading font-bold text-foreground">
            Model Benchmarking
          </h2>
          <p className="text-bano-text-muted leading-relaxed">
            Bano.ai evaluates speech-recognition models on the same technical Hinglish lecture samples,
            measuring word-level and character-level error rates to compare model quality objectively.
            Results are computed server-side from real transcription runs — no fabricated numbers.
          </p>
          <Button asChild variant="outline" className="gap-2">
            <Link href={ROUTES.BENCHMARK}>
              View benchmark
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* CTA                                                                 */}
      {/* ------------------------------------------------------------------ */}
      <section className="py-16 sm:py-20 border-t border-border">
        <div className="rounded-2xl bg-bano-surface-sunken border border-border p-10 sm:p-16 text-center space-y-6">
          <h2 className="text-3xl sm:text-4xl font-heading font-bold text-foreground">
            Ready to start?
          </h2>
          <p className="text-bano-text-muted max-w-[44ch] mx-auto leading-relaxed">
            Create a free account and turn your first Hinglish lecture into structured notes in minutes.
          </p>
          <Button asChild size="lg" className="gap-2">
            <Link href={ROUTES.SIGNUP}>
              Get Started Free
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </section>
    </div>
  );
}
