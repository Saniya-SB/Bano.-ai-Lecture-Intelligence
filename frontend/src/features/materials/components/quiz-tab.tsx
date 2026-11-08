"use client";

import React, { useState, useRef, useEffect } from "react";
import { Quiz } from "@/types/domain/materials";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatTimestamp } from "@/lib/formatters";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import {
  Award,
  AlertCircle,
  Clock,
  Sparkles,
  RotateCcw,
  CheckCircle2,
  XCircle,
  HelpCircle,
  ArrowLeft,
  Send,
  AlertTriangle,
  Check,
} from "lucide-react";

interface QuizTabProps {
  quiz: Quiz | null;
  isLoading: boolean;
  isGenerating: boolean;
  isError: boolean;
  onGenerateQuiz: (numQuestions: number) => Promise<Quiz>;
  onRetry: () => void;
  onTimestampClick?: (seconds: number) => void;
  onBackToLecture?: () => void;
}

export function QuizTab({
  quiz,
  isLoading,
  isGenerating,
  isError,
  onGenerateQuiz,
  onRetry,
  onTimestampClick,
  onBackToLecture,
}: QuizTabProps) {
  // Preserve question count across navigation / setup screen
  const [selectedNumQuestions, setSelectedNumQuestions] = useState<number>(5);

  // User in-progress setup vs attempt state
  const [inSetupMode, setInSetupMode] = useState<boolean>(false);

  // Attempt State
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, number>>({});
  const [isSubmitted, setIsSubmitted] = useState<boolean>(false);

  // Dialog states
  const [showResetDialog, setShowResetDialog] = useState<boolean>(false);
  const [showSubmitConfirmDialog, setShowSubmitConfirmDialog] = useState<boolean>(false);
  const [showUnansweredWarningDialog, setShowUnansweredWarningDialog] = useState<boolean>(false);

  // Unanswered review highlight tracking
  const [highlightUnanswered, setHighlightUnanswered] = useState<boolean>(false);

  // Post-submission explanation reveal toggle: { [questionId]: boolean }
  const [revealedExplanations, setRevealedExplanations] = useState<Record<string, boolean>>({});

  // Question card DOM element references for smooth scroll on review
  const questionRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // Results screen container ref for auto-scrolling to top upon submission
  const resultsTopRef = useRef<HTMLDivElement | null>(null);

  // Auto-scroll to the top of the Assessment Results whenever isSubmitted becomes true
  useEffect(() => {
    if (isSubmitted && resultsTopRef.current) {
      resultsTopRef.current.scrollIntoView?.({
        behavior: "smooth",
        block: "start",
      });
    }
  }, [isSubmitted]);

  // Start fresh quiz generation
  const handleStartGeneration = async () => {
    if (isGenerating) return;
    try {
      await onGenerateQuiz(selectedNumQuestions);
      // Fresh attempt: clear state
      setSelectedAnswers({});
      setIsSubmitted(false);
      setRevealedExplanations({});
      setInSetupMode(false);
      setHighlightUnanswered(false);
    } catch {
      // Handled via isError
    }
  };

  // Back to Quiz Setup
  const handleBackToSetup = () => {
    setInSetupMode(true);
    // Preserves selectedNumQuestions, clears current answers and results
    setSelectedAnswers({});
    setIsSubmitted(false);
    setRevealedExplanations({});
    setHighlightUnanswered(false);
  };

  // Handle Option Select during active attempt
  const handleOptionSelect = (questionId: string, optionIndex: number) => {
    if (isSubmitted) return; // Prevent answer changes after submission
    setSelectedAnswers((prev) => ({
      ...prev,
      [questionId]: optionIndex,
    }));
  };

  // Reset Answers Action (called after confirmation)
  const handleConfirmReset = () => {
    setSelectedAnswers({});
    setHighlightUnanswered(false);
    setShowResetDialog(false);
  };

  // Submit flow
  const handleSubmitClick = () => {
    if (!quiz || isSubmitted) return;

    // Check for unanswered questions
    const unansweredList = quiz.questions.filter(
      (q) => typeof selectedAnswers[q.id] !== "number"
    );

    if (unansweredList.length > 0) {
      setShowUnansweredWarningDialog(true);
    } else {
      setShowSubmitConfirmDialog(true);
    }
  };

  // Final submission confirmation (handles both fully answered and Submit Anyway)
  const handleConfirmSubmit = () => {
    setIsSubmitted(true);
    setShowSubmitConfirmDialog(false);
    setShowUnansweredWarningDialog(false);
    setHighlightUnanswered(false);
  };

  // Review Unanswered Action
  const handleReviewUnanswered = () => {
    setShowUnansweredWarningDialog(false);
    setHighlightUnanswered(true);

    if (!quiz) return;
    // Find first unanswered question and scroll to it
    const firstUnanswered = quiz.questions.find(
      (q) => typeof selectedAnswers[q.id] !== "number"
    );
    if (firstUnanswered && questionRefs.current[firstUnanswered.id]) {
      questionRefs.current[firstUnanswered.id]?.scrollIntoView?.({
        behavior: "smooth",
        block: "center",
      });
    }
  };

  // Toggle explanation after submission
  const toggleExplanation = (questionId: string) => {
    setRevealedExplanations((prev) => ({
      ...prev,
      [questionId]: !prev[questionId],
    }));
  };

  // Calculate Results
  const totalQuestions = quiz?.questions.length ?? 0;
  const answeredCount = quiz?.questions.filter(
    (q) => typeof selectedAnswers[q.id] === "number"
  ).length ?? 0;
  const unansweredCount = totalQuestions - answeredCount;

  const correctCount = quiz?.questions.filter((q) => {
    const studentAnswer = selectedAnswers[q.id];
    return typeof studentAnswer === "number" && studentAnswer === q.correctOptionIndex;
  }).length ?? 0;

  const incorrectCount = quiz?.questions.filter((q) => {
    const studentAnswer = selectedAnswers[q.id];
    return typeof studentAnswer === "number" && studentAnswer !== q.correctOptionIndex;
  }).length ?? 0;

  const accuracyPercent =
    totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;

  const unansweredQuestionNumbers = (quiz?.questions || [])
    .map((q, idx) => (typeof selectedAnswers[q.id] !== "number" ? idx + 1 : null))
    .filter((n): n is number => n !== null);

  // 1. Loading / Generating State
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

  // 2. Error State
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

  // 3. Quiz Setup Screen (shown if no quiz exists yet, or if student navigated Back to Quiz Setup)
  if (!quiz || quiz.questions.length === 0 || inSetupMode) {
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

  // 4. Results Screen (shown after confirmed submission)
  if (isSubmitted) {
    return (
      <div ref={resultsTopRef} className="space-y-6 scroll-mt-6">
        {/* Results Summary Card */}
        <Card className="p-6 sm:p-8 space-y-6 bg-card border-border">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-border">
            <div className="space-y-1">
              <span className="text-xs font-bold text-bano-accent uppercase tracking-wider">
                Quiz Completed
              </span>
              <h3 className="font-heading font-bold text-2xl text-foreground">
                Your Assessment Results
              </h3>
              <p className="text-xs text-bano-text-muted">
                Review your answers and verified concept explanations below.
              </p>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-auto">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleBackToSetup}
                className="text-xs"
              >
                <RotateCcw className="h-3.5 w-3.5 mr-1.5" /> Try Again
              </Button>
              {onBackToLecture && (
                <Button
                  type="button"
                  variant="default"
                  size="sm"
                  onClick={onBackToLecture}
                  className="text-xs bg-bano-accent hover:bg-bano-accent-hover text-white"
                >
                  <ArrowLeft className="h-3.5 w-3.5 mr-1.5" /> Back to Lecture
                </Button>
              )}
            </div>
          </div>

          {/* Key Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="p-4 rounded-lg bg-bano-surface-sunken border border-border text-center">
              <span className="text-[11px] text-bano-text-subtle font-medium block">Total Questions</span>
              <span className="text-xl font-bold font-heading text-foreground mt-1 block">{totalQuestions}</span>
            </div>
            <div className="p-4 rounded-lg bg-bano-success/10 border border-bano-success/20 text-center">
              <span className="text-[11px] text-bano-success font-medium block">Correct</span>
              <span className="text-xl font-bold font-heading text-bano-success mt-1 block">{correctCount}</span>
            </div>
            <div className="p-4 rounded-lg bg-bano-danger/10 border border-bano-danger/20 text-center">
              <span className="text-[11px] text-bano-danger font-medium block">Incorrect</span>
              <span className="text-xl font-bold font-heading text-bano-danger mt-1 block">{incorrectCount}</span>
            </div>
            <div className="p-4 rounded-lg bg-bano-surface-sunken border border-border text-center">
              <span className="text-[11px] text-bano-text-subtle font-medium block">Unanswered</span>
              <span className="text-xl font-bold font-heading text-bano-text-muted mt-1 block">{unansweredCount}</span>
            </div>
            <div className="p-4 rounded-lg bg-bano-accent-soft/40 border border-bano-accent/20 text-center">
              <span className="text-[11px] text-bano-accent font-medium block">Score</span>
              <span className="text-xl font-bold font-heading text-bano-accent mt-1 block">{correctCount}/{totalQuestions}</span>
            </div>
            <div className="p-4 rounded-lg bg-bano-accent-soft/40 border border-bano-accent/20 text-center">
              <span className="text-[11px] text-bano-accent font-medium block">Accuracy</span>
              <span className="text-xl font-bold font-heading text-bano-accent mt-1 block">{accuracyPercent}%</span>
            </div>
          </div>
        </Card>

        {/* Detailed Question Review List */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h4 className="font-heading font-semibold text-lg text-foreground">
              Answer Review & Explanations
            </h4>
            <span className="text-xs text-bano-text-subtle">
              Attempt locked &bull; {totalQuestions} questions reviewed
            </span>
          </div>

          {quiz.questions.map((q, qIdx) => {
            const studentAnswer = selectedAnswers[q.id];
            const isAnswered = typeof studentAnswer === "number";
            const isCorrect = isAnswered && studentAnswer === q.correctOptionIndex;
            const isExplanationRevealed = revealedExplanations[q.id] ?? true; // Defaults to revealed in review

            const status = !isAnswered ? "unanswered" : isCorrect ? "correct" : "incorrect";

            return (
              <Card
                key={q.id}
                className={`p-6 space-y-4 border ${
                  status === "correct"
                    ? "border-bano-success/40 bg-card"
                    : status === "incorrect"
                    ? "border-bano-danger/40 bg-card"
                    : "border-border-strong bg-card/60"
                }`}
              >
                {/* Header */}
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-bano-accent uppercase tracking-wider">
                        Question {qIdx + 1}
                      </span>

                      {/* Status Badge */}
                      {status === "correct" && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-bano-success bg-bano-success/15 px-2 py-0.5 rounded-full">
                          <CheckCircle2 className="h-3 w-3" /> Correct (+1)
                        </span>
                      )}
                      {status === "incorrect" && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-bano-danger bg-bano-danger/15 px-2 py-0.5 rounded-full">
                          <XCircle className="h-3 w-3" /> Incorrect (0)
                        </span>
                      )}
                      {status === "unanswered" && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-bano-text-subtle bg-bano-surface-sunken px-2 py-0.5 rounded-full border border-border">
                          <AlertCircle className="h-3 w-3" /> Unanswered (0)
                        </span>
                      )}
                    </div>

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
                          title="Jump to source timestamp in transcript"
                        >
                          <Clock className="h-2.5 w-2.5" />
                          {formatTimestamp(range.start)}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Options Review */}
                <div className="space-y-2 pt-1">
                  {q.options.map((option, optIdx) => {
                    const isSelected = studentAnswer === optIdx;
                    const isActualCorrect = q.correctOptionIndex === optIdx;

                    let optionStyle = "bg-card border-border text-foreground/80";
                    let badge = null;

                    if (isActualCorrect) {
                      optionStyle = "bg-bano-success/15 border-bano-success font-medium text-foreground";
                      badge = (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-bano-success">
                          <Check className="h-3.5 w-3.5" /> Correct Answer
                        </span>
                      );
                    } else if (isSelected && !isActualCorrect) {
                      optionStyle = "bg-bano-danger/15 border-bano-danger font-medium text-foreground";
                      badge = (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-bano-danger">
                          <XCircle className="h-3.5 w-3.5" /> Your Answer
                        </span>
                      );
                    }

                    return (
                      <div
                        key={optIdx}
                        className={`w-full p-3.5 rounded-lg border text-sm flex items-center justify-between ${optionStyle}`}
                      >
                        <div className="flex items-center gap-3">
                          <span
                            className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold shrink-0 ${
                              isActualCorrect
                                ? "bg-bano-success text-white"
                                : isSelected
                                ? "bg-bano-danger text-white"
                                : "bg-bano-surface-sunken text-bano-text-muted"
                            }`}
                          >
                            {String.fromCharCode(65 + optIdx)}
                          </span>
                          <span>{option}</span>
                        </div>

                        {badge}
                      </div>
                    );
                  })}
                </div>

                {/* Student's answer summary for unanswered */}
                {!isAnswered && (
                  <p className="text-xs text-bano-text-subtle italic">
                    Your Answer: Not answered.
                  </p>
                )}

                {/* Explanation */}
                {q.explanation && (
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={() => toggleExplanation(q.id)}
                      className="inline-flex items-center gap-1.5 text-xs text-bano-accent font-medium hover:underline"
                    >
                      <HelpCircle className="h-3.5 w-3.5" />
                      {isExplanationRevealed ? "Hide Explanation" : "Show Explanation"}
                    </button>

                    {isExplanationRevealed && (
                      <div className="mt-2 p-3.5 rounded-lg bg-bano-surface-sunken border border-border text-xs text-foreground/90 leading-relaxed">
                        <span className="font-semibold text-bano-text-subtle block mb-1 uppercase tracking-wider text-[10px]">
                          Concept Explanation:
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

        {/* Bottom Navigation CTAs */}
        <div className="flex items-center justify-between p-4 bg-card rounded-lg border border-border">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleBackToSetup}
            className="text-xs"
          >
            <RotateCcw className="h-3.5 w-3.5 mr-1.5" /> Try Again with New Quiz
          </Button>

          {onBackToLecture && (
            <Button
              type="button"
              size="sm"
              onClick={onBackToLecture}
              className="text-xs bg-bano-accent hover:bg-bano-accent-hover text-white"
            >
              <ArrowLeft className="h-3.5 w-3.5 mr-1.5" /> Return to Lecture Workspace
            </Button>
          )}
        </div>
      </div>
    );
  }

  // 5. Active Quiz Attempt Screen
  return (
    <div className="space-y-6">
      {/* Quiz Top Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 bg-card rounded-lg border border-border">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleBackToSetup}
              className="text-xs h-7 px-2 text-bano-text-muted hover:text-foreground -ml-2"
              title="Return to setup"
            >
              <ArrowLeft className="h-3.5 w-3.5 mr-1" /> Back to Quiz Setup
            </Button>

            <span className="text-border">|</span>

            <span className="text-xs font-semibold text-foreground">
              {answeredCount} of {totalQuestions} Answered
            </span>
          </div>

          <p className="text-xs text-bano-text-muted">
            {quiz.disclaimer}
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 shrink-0">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setShowResetDialog(true)}
            disabled={answeredCount === 0}
            className="text-xs"
          >
            <RotateCcw className="h-3.5 w-3.5 mr-1" /> Reset Answers
          </Button>
        </div>
      </div>

      {/* Questions Attempt List */}
      <div className="space-y-6">
        {quiz.questions.map((q, qIdx) => {
          const selectedOption = selectedAnswers[q.id];
          const hasSelected = typeof selectedOption === "number";
          const isCardHighlighted = highlightUnanswered && !hasSelected;

          return (
            <div
              key={q.id}
              ref={(el) => {
                questionRefs.current[q.id] = el;
              }}
            >
              <Card
                className={`p-6 space-y-4 transition-all duration-200 border ${
                  isCardHighlighted
                    ? "border-bano-accent shadow-md bg-bano-accent-soft/10 ring-1 ring-bano-accent/40"
                    : "border-border"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-bano-accent uppercase tracking-wider">
                        Question {qIdx + 1}
                      </span>

                      {/* Answered / Unanswered Indicator */}
                      {hasSelected ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-bano-success bg-bano-success/15 px-2 py-0.5 rounded-full">
                          <CheckCircle2 className="h-3 w-3" /> Answered
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-bano-text-subtle bg-bano-surface-sunken px-2 py-0.5 rounded-full border border-border">
                          Unanswered
                        </span>
                      )}
                    </div>

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

                {/* Options List */}
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
                            ? "bg-bano-accent-soft/30 border-bano-accent text-foreground font-medium shadow-sm"
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
              </Card>
            </div>
          );
        })}
      </div>

      {/* Submit Quiz Bottom Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 bg-card rounded-lg border border-border">
        <div className="text-xs text-bano-text-muted text-center sm:text-left">
          {unansweredCount > 0 ? (
            <span className="text-bano-accent font-medium">
              {unansweredCount} question{unansweredCount > 1 ? "s" : ""} left unanswered
            </span>
          ) : (
            <span className="text-bano-success font-medium flex items-center gap-1">
              <CheckCircle2 className="h-3.5 w-3.5" /> All questions answered
            </span>
          )}
        </div>

        <Button
          type="button"
          onClick={handleSubmitClick}
          className="w-full sm:w-auto px-8 bg-bano-accent hover:bg-bano-accent-hover text-white text-xs font-semibold shadow-sm"
        >
          <Send className="h-3.5 w-3.5 mr-2" /> Submit Quiz
        </Button>
      </div>

      {/* ────────────────── DIALOGS ────────────────── */}

      {/* 1. Reset Confirmation Dialog */}
      <AlertDialog open={showResetDialog} onOpenChange={setShowResetDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset Quiz Answers?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to reset your answers? All selected options will be cleared, and questions will be marked as unanswered. Your question selection will not be regenerated.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <Button
              type="button"
              variant="destructive"
              onClick={handleConfirmReset}
            >
              Reset Answers
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 2. Submit All Answered Confirmation Dialog */}
      <AlertDialog open={showSubmitConfirmDialog} onOpenChange={setShowSubmitConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Submit Quiz?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to submit your quiz? Once submitted, your answers will be locked, and your final score and detailed explanations will be revealed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <Button
              type="button"
              onClick={handleConfirmSubmit}
              className="bg-bano-accent hover:bg-bano-accent-hover text-white"
            >
              Confirm Submission
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 3. Unanswered Warning Dialog */}
      <AlertDialog
        open={showUnansweredWarningDialog}
        onOpenChange={setShowUnansweredWarningDialog}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <div className="flex items-center gap-2 text-bano-accent mb-1">
              <AlertTriangle className="h-5 w-5 text-bano-accent" />
              <AlertDialogTitle>Unanswered Questions</AlertDialogTitle>
            </div>
            <AlertDialogDescription className="space-y-2">
              <span>
                You have {unansweredCount} unanswered question{unansweredCount > 1 ? "s" : ""}. Would you like to review them before submitting?
              </span>
              <span className="block font-medium text-foreground pt-1">
                Unanswered Question Numbers: {unansweredQuestionNumbers.join(", ")}
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <Button
              type="button"
              variant="outline"
              onClick={handleReviewUnanswered}
              className="text-xs"
            >
              Review Unanswered Questions
            </Button>
            <Button
              type="button"
              onClick={handleConfirmSubmit}
              className="text-xs bg-bano-accent hover:bg-bano-accent-hover text-white"
            >
              Submit Anyway
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
