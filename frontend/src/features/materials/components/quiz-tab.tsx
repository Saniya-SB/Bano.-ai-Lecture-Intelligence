"use client";

import React, { useState } from "react";
import { Quiz } from "@/types/domain/materials";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatTimestamp } from "@/lib/formatters";
import {
  Award,
  AlertCircle,
  FileText,
  Clock,
  Sparkles,
  RotateCcw,
  CheckCircle2,
  HelpCircle,
} from "lucide-react";

interface QuizTabProps {
  quiz: Quiz | null;
  isLoading: boolean;
  isGenerating: boolean;
  isError: boolean;
  onGenerateQuiz: (numQuestions: number) => Promise<Quiz>;
  onRetry: () => void;
  onTimestampClick?: (seconds: number) => void;
}

export function QuizTab({
  quiz,
  isLoading,
  isGenerating,
  isError,
  onGenerateQuiz,
  onRetry,
  onTimestampClick,
}: QuizTabProps) {
  const [selectedNumQuestions, setSelectedNumQuestions] = useState<number>(5);
  // Track selected option per question ID: { [questionId]: optionIndex }
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, number>>({});
  // Track revealed explanations: { [questionId]: boolean }
  const [revealedExplanations, setRevealedExplanations] = useState<Record<string, boolean>>({});

  const handleOptionSelect = (questionId: string, optionIndex: number) => {
    setSelectedAnswers((prev) => ({
      ...prev,
      [questionId]: optionIndex,
    }));
  };

  const toggleExplanation = (questionId: string) => {
    setRevealedExplanations((prev) => ({
      ...prev,
      [questionId]: !prev[questionId],
    }));
  };

  const handleStartGeneration = async () => {
    if (isGenerating) return;
    try {
      await onGenerateQuiz(selectedNumQuestions);
      setSelectedAnswers({});
      setRevealedExplanations({});
    } catch {
      // Handled via isError
    }
  };

  if (isLoading || isGenerating) {
    return (
      <Card className="p-12 text-center space-y-4 animate-pulse">
        <Sparkles className="h-10 w-10 mx-auto text-bano-accent animate-spin" />
        <h3 className="font-heading font-semibold text-base">
          {isGenerating
            ? `Generating ${selectedNumQuestions} Quiz Questions...`
            : "Loading Quiz..."}
        </h3>
        <p className="text-xs text-bano-text-muted max-w-sm mx-auto">
          AI is grounding self-assessment multiple-choice questions strictly from the core concept and example segments of this lecture.
        </p>
      </Card>
    );
  }

  if (isError) {
    return (
      <Card className="p-10 text-center space-y-3">
        <AlertCircle className="h-8 w-8 mx-auto text-bano-danger" />
        <h3 className="font-heading font-semibold text-base">Quiz Generation Failed</h3>
        <p className="text-xs text-bano-text-muted">
          Could not generate questions at this time. Please try again.
        </p>
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex items-center justify-center px-4 py-2 rounded-md bg-bano-accent text-white text-xs font-medium hover:bg-bano-accent-hover transition-colors"
        >
          Try Again
        </button>
      </Card>
    );
  }

  // If no quiz has been generated yet, render on-demand generation configuration
  if (!quiz || quiz.questions.length === 0) {
    return (
      <Card className="p-8 sm:p-12 text-center space-y-6 max-w-xl mx-auto">
        <div className="p-3 w-14 h-14 mx-auto rounded-full bg-bano-accent-soft text-bano-accent flex items-center justify-center">
          <Award className="h-7 w-7" />
        </div>

        <div className="space-y-2">
          <h3 className="font-heading font-bold text-xl text-foreground">
            Generate AI Practice Quiz
          </h3>
          <p className="text-xs sm:text-sm text-bano-text-muted leading-relaxed">
            Test your understanding with targeted multiple-choice questions derived directly from the concepts taught in this lecture.
          </p>
        </div>

        {/* Question count selector */}
        <div className="space-y-3 pt-2">
          <label className="text-xs font-semibold text-foreground block">
            Select Number of Questions:
          </label>
          <div className="flex justify-center gap-2">
            {[3, 5, 10, 15].map((count) => (
              <button
                key={count}
                type="button"
                onClick={() => setSelectedNumQuestions(count)}
                className={`px-4 py-2 rounded-lg text-xs font-medium border transition-all ${
                  selectedNumQuestions === count
                    ? "bg-bano-accent text-white border-bano-accent font-semibold shadow-sm"
                    : "bg-card text-bano-text-muted border-border hover:text-foreground"
                }`}
              >
                {count} Questions
              </button>
            ))}
          </div>
          <p className="text-[11px] text-bano-text-subtle">
            Minimum: 1 &bull; Maximum: 15 questions per quiz
          </p>
        </div>

        <Button
          type="button"
          onClick={handleStartGeneration}
          disabled={isGenerating}
          className="w-full sm:w-auto px-8 bg-bano-accent hover:bg-bano-accent-hover text-white"
        >
          <Sparkles className="h-4 w-4 mr-2" /> Start Quiz
        </Button>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Quiz Header & AI Disclaimer */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 bg-card rounded-lg border border-border">
        <div>
          <h3 className="font-heading font-semibold text-base text-foreground">
            Knowledge Check ({quiz.questions.length} Questions)
          </h3>
          <p className="text-xs text-bano-text-muted mt-0.5">
            {quiz.disclaimer}
          </p>
        </div>

        {/* Re-generate button */}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setSelectedAnswers({})}
          className="text-xs self-start sm:self-auto shrink-0"
        >
          <RotateCcw className="h-3.5 w-3.5 mr-1" /> Reset Answers
        </Button>
      </div>

      {/* Questions List */}
      <div className="space-y-6">
        {quiz.questions.map((q, qIdx) => {
          const selectedOption = selectedAnswers[q.id];
          const hasSelected = typeof selectedOption === "number";
          const isExplanationRevealed = revealedExplanations[q.id] ?? false;

          return (
            <Card key={q.id} className="p-6 space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <span className="text-xs font-bold text-bano-accent uppercase tracking-wider">
                    Question {qIdx + 1}
                  </span>
                  <h4 className="font-heading font-semibold text-base text-foreground leading-snug">
                    {q.question}
                  </h4>
                </div>

                {q.referencedTimeRanges && q.referencedTimeRanges.length > 0 && (
                  <div className="flex items-center gap-1 shrink-0">
                    {q.referencedTimeRanges.map((range, rIdx) => (
                      <button
                        key={rIdx}
                        type="button"
                        onClick={() => onTimestampClick?.(range.start)}
                        className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-bano-surface-sunken text-bano-text-subtle hover:text-bano-accent hover:underline border border-border flex items-center gap-1"
                        title="Jump to source timestamp"
                      >
                        <Clock className="h-2.5 w-2.5" />
                        {formatTimestamp(range.start)}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Options */}
              <div className="space-y-2 pt-1">
                {q.options.map((option, optIdx) => {
                  const isSelected = selectedOption === optIdx;

                  return (
                    <button
                      key={optIdx}
                      type="button"
                      onClick={() => handleOptionSelect(q.id, optIdx)}
                      className={`w-full text-left p-3.5 rounded-lg border text-sm transition-all flex items-center justify-between ${
                        isSelected
                          ? "bg-bano-accent-soft/30 border-bano-accent text-foreground font-medium"
                          : "bg-card border-border text-foreground hover:bg-bano-surface-sunken"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold shrink-0 ${
                            isSelected
                              ? "bg-bano-accent text-white"
                              : "bg-bano-surface-sunken text-bano-text-muted"
                          }`}
                        >
                          {String.fromCharCode(65 + optIdx)}
                        </span>
                        <span>{option}</span>
                      </div>

                      {isSelected && (
                        <CheckCircle2 className="h-4 w-4 text-bano-accent shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Explanation trigger & Backend-provided explanation */}
              {hasSelected && q.explanation && (
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => toggleExplanation(q.id)}
                    className="inline-flex items-center gap-1.5 text-xs text-bano-accent font-medium hover:underline"
                  >
                    <HelpCircle className="h-3.5 w-3.5" />
                    {isExplanationRevealed ? "Hide Explanation" : "Show Backend Explanation"}
                  </button>

                  {isExplanationRevealed && (
                    <div className="mt-2 p-3.5 rounded-lg bg-bano-surface-sunken border border-border text-xs text-foreground/90 leading-relaxed">
                      <span className="font-semibold text-bano-text-subtle block mb-1 uppercase tracking-wider text-[10px]">
                        Teacher Note / Concept Explanation:
                      </span>
                      {q.explanation}
                    </div>
                  )}
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
