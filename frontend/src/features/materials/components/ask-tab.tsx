"use client";

import React, { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  MessageSquare,
  Sparkles,
  Send,
  Loader2,
  AlertCircle,
  HelpCircle,
} from "lucide-react";
import { lectureService } from "@/services/lecture-service";
import { KeyConcept } from "@/types/domain/materials";

interface AskTabProps {
  lectureId: string;
  keyConcepts?: KeyConcept[];
}

export function AskTab({ lectureId, keyConcepts = [] }: AskTabProps) {
  const [question, setQuestion] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastAskedQuestion, setLastAskedQuestion] = useState<string | null>(null);
  const [result, setResult] = useState<{
    answer: string;
    is_ai_generated: boolean;
    answered: boolean;
  } | null>(null);

  // Suggested questions from key concepts
  const suggestedQuestions = keyConcepts
    .slice(0, 3)
    .map((kc) => `Explain ${kc.concept.toLowerCase()} and its core property.`);

  const handleAsk = async (qToSubmit?: string) => {
    const targetQ = (qToSubmit || question).trim();
    if (!targetQ || isLoading) return;

    setError(null);
    setIsLoading(true);
    setLastAskedQuestion(targetQ);

    try {
      const resp = await lectureService.askLecture(lectureId, targetQ);
      setResult(resp);
      if (!qToSubmit) {
        setQuestion("");
      }
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : "Question submit karne mein samasya aayi. Kripya punah prayas karein."
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Intro Disclaimer Banner */}
      <div className="p-3 bg-bano-surface-sunken rounded-md border border-border text-xs text-bano-text flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="font-semibold px-1.5 py-0.5 rounded bg-bano-accent/20 text-bano-text text-[11px] shrink-0">
            AI ne banaya, teacher ka exact statement nahi.
          </span>
          <span className="text-bano-text-muted">
            Question Hindi, Hinglish ya English mein puchhein — answer strictly lecture concepts par grounded hoga.
          </span>
        </div>
      </div>

      {/* Input Card */}
      <Card className="p-6 space-y-4">
        <div className="flex items-center gap-2 border-b border-border pb-3">
          <MessageSquare className="h-4 w-4 text-bano-accent" />
          <h3 className="font-heading font-semibold text-base text-foreground">
            Ask this lecture
          </h3>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleAsk();
          }}
          className="space-y-3"
        >
          <div className="flex flex-col sm:flex-row gap-2">
            <Input
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="e.g. Recursion mein base condition na ho toh kya hoga?"
              disabled={isLoading}
              className="flex-1 bg-card text-foreground"
            />
            <Button
              type="submit"
              disabled={isLoading || !question.trim()}
              className="gap-2 bg-bano-primary text-white hover:bg-bano-primary/90 shrink-0 font-medium"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Dhoond rahe hain…
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  Ask
                </>
              )}
            </Button>
          </div>
        </form>

        {/* Suggested questions from key concepts */}
        {suggestedQuestions.length > 0 && (
          <div className="space-y-2 pt-1">
            <span className="text-[11px] font-semibold text-bano-text-subtle uppercase tracking-wider block">
              Suggested questions:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {suggestedQuestions.map((sq, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => {
                    setQuestion(sq);
                    handleAsk(sq);
                  }}
                  disabled={isLoading}
                  className="text-xs text-left px-2.5 py-1 rounded bg-bano-surface-sunken hover:bg-bano-accent-soft/40 hover:text-bano-accent border border-border text-foreground transition-colors"
                >
                  {sq}
                </button>
              ))}
            </div>
          </div>
        )}
      </Card>

      {/* Loading State */}
      {isLoading && (
        <Card className="p-8 text-center space-y-3 animate-pulse">
          <Sparkles className="h-8 w-8 mx-auto text-bano-accent animate-spin" />
          <p className="font-heading font-semibold text-sm text-foreground">
            Lecture transcript se relevant segments dhoond rahe hain…
          </p>
          <p className="text-xs text-bano-text-muted">
            Lexical scoring ke zariye relevant explanation synthesize ho rahi hai.
          </p>
        </Card>
      )}

      {/* Error State */}
      {error && !isLoading && (
        <Card className="p-6 border-bano-danger/30 bg-bano-danger-soft space-y-2">
          <div className="flex items-center gap-2 text-bano-danger text-sm font-semibold">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>Answer fetch karne mein samasya aayi</span>
          </div>
          <p className="text-xs text-bano-text leading-relaxed">{error}</p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => handleAsk(lastAskedQuestion || undefined)}
            className="text-xs mt-2 border-bano-danger/40"
          >
            Retry Question
          </Button>
        </Card>
      )}

      {/* Answer View */}
      {result && !isLoading && (
        <Card
          className={`p-6 space-y-4 border ${
            result.answered
              ? "border-border bg-card"
              : "border-bano-warning/40 bg-bano-warning-soft/20"
          }`}
        >
          <div className="flex items-start justify-between gap-3 border-b border-border/80 pb-3">
            <div>
              <span className="text-[11px] font-mono text-bano-text-subtle uppercase">
                {result.answered ? "Grounded Answer" : "Topic Not Covered"}
              </span>
              {lastAskedQuestion && (
                <h4 className="font-heading font-semibold text-sm sm:text-base text-foreground mt-0.5">
                  &ldquo;{lastAskedQuestion}&rdquo;
                </h4>
              )}
            </div>
            {result.answered ? (
              <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded bg-bano-success-soft text-bano-success shrink-0">
                Found in lecture
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded bg-bano-warning-soft text-bano-warning shrink-0">
                <HelpCircle className="h-3.5 w-3.5" /> Not in lecture
              </span>
            )}
          </div>

          <div className="text-sm text-foreground leading-relaxed whitespace-pre-line">
            {result.answer}
          </div>

          <div className="pt-2 border-t border-border/60 text-[11px] text-bano-text-subtle">
            AI ne banaya — teacher ka exact statement nahi.
          </div>
        </Card>
      )}
    </div>
  );
}

