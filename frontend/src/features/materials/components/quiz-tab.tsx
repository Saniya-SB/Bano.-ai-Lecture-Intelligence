"use client";

import React, { useState } from "react";
import { Quiz } from "@/types/domain/materials";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Award,
  AlertCircle,
  FileText,
  RotateCcw,
  CheckCircle2,
  HelpCircle,
  Loader2,
} from "lucide-react";interface QuizTabProps {
  quiz: Quiz | null;
  isLoading: boolean;
  isGenerating: boolean;
  isError: boolean;
  onGenerateQuiz: (numQuestions: number) => Promise<Quiz>;
  onRetry: () => void;
}

export function QuizTab({
  quiz,
  isLoading,
  isGenerating,
  isError,
  onGenerateQuiz,
  onRetry,
}: QuizTabProps) {
  const [selectedNumQuestions, setSelectedNumQuestions] = useState<number>(5);
  // Track selected option per question ID: { [questionId]: optionIndex }
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, number>>({});
  // Track revealed explanations: { [questionId]: boolean }
  const [revealedExplanations, setRevealedExplanations] = useState<Record<string, boolean>>({});

  const answeredCount = Object.keys(selectedAnswers).length;
  const correctCount = quiz
    ? quiz.questions.reduce((acc, q) => {
        return selectedAnswers[q.id] === q.correctOptionIndex ? acc + 1 : acc;
      }, 0)
    : 0;

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
      <Card className="p-12 text-center space-y-4">
        <Loader2 className="h-8 w-8 mx-auto text-bano-secondary-ink animate-spin" />
        <h3 className="font-heading font-semibold text-base">
          {isGenerating
            ? `${selectedNumQuestions} questions taiyaar ho rahe hain...`
            : "Quiz load ho raha hai..."}
        </h3>
        <p className="text-xs text-bano-text-muted max-w-sm mx-auto">
          Lecture ke core concepts se factual multiple-choice questions ban rahe hain.
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
            Practice Quiz
          </h3>
          <p className="text-xs sm:text-sm text-bano-text-muted leading-relaxed">
            Lecture ke concepts pe based multiple-choice questions se revision karo.
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
          className="w-full sm:w-auto px-8 bg-bano-primary hover:bg-bano-primary/90 text-white font-medium"
        >
          Quiz shuru karo
        </Button>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Quiz Header, Score Summary & AI Disclaimer */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 bg-card rounded-md border border-border">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h3 className="font-heading font-semibold text-base text-foreground">
              Knowledge Check ({quiz.questions.length} Questions)
            </h3>
            <span className="font-semibold px-1.5 py-0.5 rounded bg-bano-accent/20 text-bano-text text-[11px]">
              AI ne banaya, teacher ka exact statement nahi.
            </span>
          </div>
          <p className="text-xs text-bano-text-muted">
            {quiz.disclaimer}
          </p>
          {answeredCount > 0 && (
            <div className="flex items-center gap-2 pt-1 font-mono text-xs">
              <span className="font-semibold text-foreground">
                Score: {correctCount}/{answeredCount}
              </span>
              <span className="text-bano-text-muted">
                ({Math.round((correctCount / quiz.questions.length) * 100)}% of total)
              </span>
              {answeredCount === quiz.questions.length && (
                <span className="text-bano-success font-medium">✓ Completed!</span>
              )}
            </div>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              setSelectedAnswers({});
              setRevealedExplanations({});
            }}
            className="text-xs"
          >
            <RotateCcw className="h-3.5 w-3.5 mr-1" /> Reset Answers
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={handleStartGeneration}
            disabled={isGenerating}
            className="text-xs bg-bano-primary text-white hover:bg-bano-primary/90"
          >
            <RotateCcw className="h-3.5 w-3.5 mr-1" /> Re-generate Quiz
          </Button>
        </div>
      </div>

      {/* Questions List */}
      <div className="space-y-6">
        {quiz.questions.map((q, qIdx) => {
          const selectedOption = selectedAnswers[q.id];
          const hasSelected = typeof selectedOption === "number";
          const isExplanationRevealed = revealedExplanations[q.id] ?? false;

          return (
            <Card key={q.id} className="p-6 space-y-4">
              <div className="space-y-1">
                <span className="text-xs font-bold text-bano-accent uppercase tracking-wider">
                  Question {qIdx + 1}
                </span>
                <h4 className="font-heading font-semibold text-base text-foreground leading-snug">
                  {q.question}
                </h4>
              </div>

              {/* Options */}
              <div className="space-y-2 pt-1">
                {q.options.map((option, optIdx) => {
                  const isSelected = selectedOption === optIdx;
                  const isCorrect = optIdx === q.correctOptionIndex;

                  let optionStyle = "bg-card border-border text-foreground hover:bg-bano-surface-sunken";
                  if (hasSelected) {
                    if (isCorrect) {
                      optionStyle = "bg-bano-success-soft/30 border-bano-success text-foreground font-medium";
                    } else if (isSelected) {
                      optionStyle = "bg-bano-danger-soft/30 border-bano-danger text-foreground font-medium";
                    } else {
                      optionStyle = "bg-card border-border text-bano-text-muted opacity-70";
                    }
                  } else if (isSelected) {
                    optionStyle = "bg-bano-accent-soft/30 border-bano-accent text-foreground font-medium";
                  }

                  let badgeStyle = "bg-bano-surface-sunken text-bano-text-muted";
                  if (hasSelected) {
                    if (isCorrect) {
                      badgeStyle = "bg-bano-success text-white";
                    } else if (isSelected) {
                      badgeStyle = "bg-bano-danger text-white";
                    }
                  } else if (isSelected) {
                    badgeStyle = "bg-bano-accent text-white";
                  }

                  return (
                    <button
                      key={optIdx}
                      type="button"
                      onClick={() => handleOptionSelect(q.id, optIdx)}
                      className={`w-full text-left p-3.5 rounded-lg border text-sm transition-all flex items-center justify-between ${optionStyle}`}
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold shrink-0 ${badgeStyle}`}
                        >
                          {String.fromCharCode(65 + optIdx)}
                        </span>
                        <span>{option}</span>
                      </div>

                      {hasSelected && isCorrect && (
                        <span className="text-xs font-semibold text-bano-success flex items-center gap-1">
                          <CheckCircle2 className="h-4 w-4" /> Correct
                        </span>
                      )}
                      {hasSelected && isSelected && !isCorrect && (
                        <span className="text-xs font-semibold text-bano-danger">
                          Incorrect
                        </span>
                      )}
                      {!hasSelected && isSelected && (
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
