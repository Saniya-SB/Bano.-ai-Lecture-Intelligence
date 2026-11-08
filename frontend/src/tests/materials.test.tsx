import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import React from "react";
import { NotesTab } from "@/features/materials/components/notes-tab";
import { SummaryTab } from "@/features/materials/components/summary-tab";
import { QuestionsTab } from "@/features/materials/components/questions-tab";
import { QuizTab } from "@/features/materials/components/quiz-tab";
import { LearningMaterials, Quiz } from "@/types/domain/materials";

const mockMaterials: LearningMaterials = {
  lectureId: "lec_101",
  isAiGenerated: true,
  disclaimer: "AI-generated synthesized study material.",
  summary: {
    short: "Short overview of BST.",
    detailed: "Detailed comprehensive breakdown of BST.",
  },
  notes: [
    {
      heading: "BST Properties",
      bulletPoints: ["Left is smaller", "Right is greater"],
      referencedTimeRanges: [{ start: 10, end: 20 }],
    },
  ],
  keyConcepts: [
    {
      concept: "BST",
      explanation: "Binary Search Tree data structure.",
      referencedTimeRanges: [{ start: 5, end: 15 }],
    },
  ],
  glossary: [
    {
      term: "Subtree",
      definition: "A tree consisting of a node and descendants.",
      referencedTimeRanges: [{ start: 20, end: 30 }],
    },
  ],
  importantQuestions: [
    {
      question: "Why does in-order traversal yield sorted order?",
      suggestedAnswer: "Because left is visited before root and root before right.",
      referencedTimeRanges: [{ start: 30, end: 40 }],
    },
  ],
};

const mockQuiz: Quiz = {
  lectureId: "lec_101",
  isAiGenerated: true,
  disclaimer: "AI-generated quiz disclaimer.",
  questions: [
    {
      id: "q_1",
      question: "Where are smaller values stored in BST?",
      options: ["Left subtree", "Right subtree", "Root", "Parent"],
      correctOptionIndex: 0,
      explanation: "By BST definition, left subtree has smaller values.",
      referencedTimeRanges: [{ start: 10, end: 20 }],
    },
    {
      id: "q_2",
      question: "What is the average search time in a balanced BST?",
      options: ["O(1)", "O(log n)", "O(n)", "O(n^2)"],
      correctOptionIndex: 1,
      explanation: "Balanced BST divides search space by half at each level.",
      referencedTimeRanges: [{ start: 25, end: 35 }],
    },
    {
      id: "q_3",
      question: "What is the maximum number of children for a binary tree node?",
      options: ["1", "2", "3", "Unlimited"],
      correctOptionIndex: 1,
      explanation: "Binary trees have at most two children per node.",
      referencedTimeRanges: [{ start: 40, end: 50 }],
    },
  ],
};

describe("M6 Learning Materials Components", () => {
  describe("NotesTab", () => {
    it("renders headings, bullet points, disclaimer, and timestamp references", () => {
      const onTimestampClick = vi.fn();
      render(
        <NotesTab
          materials={mockMaterials}
          isLoading={false}
          isError={false}
          onRetry={vi.fn()}
          onTimestampClick={onTimestampClick}
        />
      );

      expect(screen.getByText("BST Properties")).toBeInTheDocument();
      expect(screen.getByText("Left is smaller")).toBeInTheDocument();
      expect(screen.getByText("AI-generated synthesized study material.")).toBeInTheDocument();

      const timeBtn = screen.getByText("00:10 - 00:20");
      expect(timeBtn).toBeInTheDocument();
      fireEvent.click(timeBtn);
      expect(onTimestampClick).toHaveBeenCalledWith(10);
    });

    it("renders empty state when materials has no notes", () => {
      render(
        <NotesTab
          materials={null}
          isLoading={false}
          isError={false}
          onRetry={vi.fn()}
        />
      );
      expect(screen.getByText(/No notes available yet/i)).toBeInTheDocument();
    });

    it("renders loading state", () => {
      const { container } = render(
        <NotesTab
          materials={null}
          isLoading={true}
          isError={false}
          onRetry={vi.fn()}
        />
      );
      expect(container.querySelector(".animate-pulse")).toBeInTheDocument();
    });

    it("renders error state and retry callback", () => {
      const onRetry = vi.fn();
      render(
        <NotesTab
          materials={null}
          isLoading={false}
          isError={true}
          onRetry={onRetry}
        />
      );
      expect(screen.getByText(/Failed to load lecture notes/i)).toBeInTheDocument();
      fireEvent.click(screen.getByRole("button", { name: /Try Again/i }));
      expect(onRetry).toHaveBeenCalledTimes(1);
    });
  });

  describe("SummaryTab", () => {
    it("renders short summary, toggles to detailed breakdown, and shows key concepts and glossary", () => {
      render(
        <SummaryTab
          materials={mockMaterials}
          isLoading={false}
          isError={false}
          onRetry={vi.fn()}
        />
      );

      // Initially shows short summary
      expect(screen.getByText("Short overview of BST.")).toBeInTheDocument();

      // Switch to detailed breakdown
      fireEvent.click(screen.getByRole("button", { name: /Detailed Breakdown/i }));
      expect(screen.getByText("Detailed comprehensive breakdown of BST.")).toBeInTheDocument();

      // Key concepts & glossary
      expect(screen.getByText("Binary Search Tree data structure.")).toBeInTheDocument();
      expect(screen.getByText("Subtree")).toBeInTheDocument();
      expect(screen.getByText("A tree consisting of a node and descendants.")).toBeInTheDocument();
    });
  });

  describe("QuestionsTab", () => {
    it("renders questions, reveals suggested answers, and supports collapse/expand", () => {
      render(
        <QuestionsTab
          materials={mockMaterials}
          isLoading={false}
          isError={false}
          onRetry={vi.fn()}
        />
      );

      expect(
        screen.getByText("Why does in-order traversal yield sorted order?")
      ).toBeInTheDocument();

      // Answer is initially collapsed
      expect(
        screen.queryByText("Because left is visited before root and root before right.")
      ).not.toBeInTheDocument();

      // Expand answer
      const toggleBtn = screen.getByRole("button", { name: /Show answer/i });
      fireEvent.click(toggleBtn);

      expect(
        screen.getByText("Because left is visited before root and root before right.")
      ).toBeInTheDocument();

      // Collapse answer
      const hideBtn = screen.getByRole("button", { name: /Hide answer/i });
      fireEvent.click(hideBtn);
      expect(
        screen.queryByText("Because left is visited before root and root before right.")
      ).not.toBeInTheDocument();
    });
  });

  describe("QuizTab", () => {
    it("renders on-demand generation interface with question count choices and generates quiz on start", async () => {
      const onGenerate = vi.fn().mockResolvedValue(mockQuiz);

      render(
        <QuizTab
          quiz={null}
          isLoading={false}
          isGenerating={false}
          isError={false}
          onGenerateQuiz={onGenerate}
          onRetry={vi.fn()}
        />
      );

      expect(screen.getByText("Generate AI Practice Quiz")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Start Quiz/i })).toBeInTheDocument();

      // Change question count to 10
      fireEvent.click(screen.getByRole("button", { name: /10 Questions/i }));

      // Click start
      fireEvent.click(screen.getByRole("button", { name: /Start Quiz/i }));
      expect(onGenerate).toHaveBeenCalledWith(10);
    });

    it("renders quiz options, keeps feedback and explanations hidden during attempt, and reveals them upon submission", async () => {
      render(
        <QuizTab
          quiz={mockQuiz}
          isLoading={false}
          isGenerating={false}
          isError={false}
          onGenerateQuiz={vi.fn()}
          onRetry={vi.fn()}
        />
      );

      expect(screen.getByText("Where are smaller values stored in BST?")).toBeInTheDocument();
      expect(screen.getByText("Left subtree")).toBeInTheDocument();
      expect(screen.getByText("Right subtree")).toBeInTheDocument();

      // Explanations must NOT be visible before submission
      expect(screen.queryByText(/By BST definition/i)).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /Show Explanation/i })).not.toBeInTheDocument();

      // Click option A for Question 1 (correct)
      fireEvent.click(screen.getByText("Left subtree"));

      // Explanation is STILL not visible before submission
      expect(screen.queryByText(/By BST definition/i)).not.toBeInTheDocument();

      // Click option B for Question 2 (correct)
      fireEvent.click(screen.getByText("O(log n)"));

      // Click option B for Question 3 (correct)
      fireEvent.click(screen.getByText("2"));

      // Submit Quiz
      const submitBtn = screen.getByRole("button", { name: /Submit Quiz/i });
      fireEvent.click(submitBtn);

      // Confirmation dialog opens
      expect(screen.getByText("Submit Quiz?")).toBeInTheDocument();
      const confirmBtn = screen.getByRole("button", { name: /Confirm Submission/i });
      fireEvent.click(confirmBtn);

      // Results screen appears
      await waitFor(() => {
        expect(screen.getByText("Your Assessment Results")).toBeInTheDocument();
      });

      // Score and accuracy displayed
      expect(screen.getByText("3/3")).toBeInTheDocument();
      expect(screen.getByText("100%")).toBeInTheDocument();

      // Explanations are now visible in review
      expect(screen.getByText(/By BST definition, left subtree has smaller values./i)).toBeInTheDocument();
    });

    it("evaluates incorrect-answer scoring accurately (mixed correct/incorrect and all-incorrect cases)", async () => {
      // 1. Mixed test: 1 correct, 2 incorrect -> 1/3 (33%)
      const { unmount } = render(
        <QuizTab
          quiz={mockQuiz}
          isLoading={false}
          isGenerating={false}
          isError={false}
          onGenerateQuiz={vi.fn()}
          onRetry={vi.fn()}
        />
      );

      // Question 1: Select "Left subtree" (Index 0 - Correct)
      fireEvent.click(screen.getByText("Left subtree"));
      // Question 2: Select "O(1)" (Index 0 - Incorrect, correct is Index 1)
      fireEvent.click(screen.getByText("O(1)"));
      // Question 3: Select "Unlimited" (Index 3 - Incorrect, correct is Index 1)
      fireEvent.click(screen.getByText("Unlimited"));

      fireEvent.click(screen.getByRole("button", { name: /Submit Quiz/i }));
      fireEvent.click(screen.getByRole("button", { name: /Confirm Submission/i }));

      await waitFor(() => {
        expect(screen.getByText("Your Assessment Results")).toBeInTheDocument();
      });

      // Verify metrics
      expect(screen.getByText("1/3")).toBeInTheDocument();
      expect(screen.getByText("33%")).toBeInTheDocument();

      unmount();

      // 2. All-incorrect test: 0 correct, 3 incorrect -> 0/3 (0%)
      render(
        <QuizTab
          quiz={mockQuiz}
          isLoading={false}
          isGenerating={false}
          isError={false}
          onGenerateQuiz={vi.fn()}
          onRetry={vi.fn()}
        />
      );

      // Question 1: Select "Right subtree" (Index 1 - Incorrect)
      fireEvent.click(screen.getByText("Right subtree"));
      // Question 2: Select "O(n)" (Index 2 - Incorrect)
      fireEvent.click(screen.getByText("O(n)"));
      // Question 3: Select "1" (Index 0 - Incorrect)
      fireEvent.click(screen.getByText("1"));

      fireEvent.click(screen.getByRole("button", { name: /Submit Quiz/i }));
      fireEvent.click(screen.getByRole("button", { name: /Confirm Submission/i }));

      await waitFor(() => {
        expect(screen.getByText("Your Assessment Results")).toBeInTheDocument();
      });

      expect(screen.getByText("0/3")).toBeInTheDocument();
      expect(screen.getByText("0%")).toBeInTheDocument();
    });

    it("preserves selected answers and keeps quiz editable when submission is cancelled", () => {
      render(
        <QuizTab
          quiz={mockQuiz}
          isLoading={false}
          isGenerating={false}
          isError={false}
          onGenerateQuiz={vi.fn()}
          onRetry={vi.fn()}
        />
      );

      // Select option for Question 1
      fireEvent.click(screen.getByText("Left subtree"));
      expect(screen.getByText(/1 of 3 Answered/i)).toBeInTheDocument();

      // Click Submit Quiz (opens Unanswered Warning since 2 are unanswered)
      fireEvent.click(screen.getByRole("button", { name: /Submit Quiz/i }));
      expect(screen.getByText("Unanswered Questions")).toBeInTheDocument();

      // Cancel submission
      fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
      expect(screen.queryByText("Unanswered Questions")).not.toBeInTheDocument();

      // Verify answer is preserved and progress unchanged
      expect(screen.getByText(/1 of 3 Answered/i)).toBeInTheDocument();

      // Verify quiz remains editable: select Question 2
      fireEvent.click(screen.getByText("O(log n)"));
      expect(screen.getByText(/2 of 3 Answered/i)).toBeInTheDocument();
    });

    it("warns about unanswered questions on submit, allows Review Unanswered, and allows Submit Anyway", async () => {
      render(
        <QuizTab
          quiz={mockQuiz}
          isLoading={false}
          isGenerating={false}
          isError={false}
          onGenerateQuiz={vi.fn()}
          onRetry={vi.fn()}
        />
      );

      // Answer only Question 1
      fireEvent.click(screen.getByText("Left subtree"));

      // Click Submit Quiz
      fireEvent.click(screen.getByRole("button", { name: /Submit Quiz/i }));

      // Warning dialog appears mentioning questions 2 and 3
      expect(screen.getByText("Unanswered Questions")).toBeInTheDocument();
      expect(screen.getByText(/Unanswered Question Numbers: 2, 3/i)).toBeInTheDocument();

      // Click Review Unanswered Questions
      fireEvent.click(screen.getByRole("button", { name: /Review Unanswered Questions/i }));
      expect(screen.queryByText("Unanswered Questions")).not.toBeInTheDocument();

      // Click Submit Quiz again
      fireEvent.click(screen.getByRole("button", { name: /Submit Quiz/i }));
      expect(screen.getByText("Unanswered Questions")).toBeInTheDocument();

      // Click Submit Anyway
      fireEvent.click(screen.getByRole("button", { name: /Submit Anyway/i }));

      // Results rendered with 1 correct, 0 incorrect, 2 unanswered, score 1/3, 33% accuracy
      await waitFor(() => {
        expect(screen.getByText("Your Assessment Results")).toBeInTheDocument();
      });
      expect(screen.getByText("1/3")).toBeInTheDocument();
      expect(screen.getByText("33%")).toBeInTheDocument();
      expect(screen.getAllByText("Unanswered (0)").length).toBe(2);
    });

    it("confirms before resetting answers and clears all selections", async () => {
      render(
        <QuizTab
          quiz={mockQuiz}
          isLoading={false}
          isGenerating={false}
          isError={false}
          onGenerateQuiz={vi.fn()}
          onRetry={vi.fn()}
        />
      );

      // Select option
      fireEvent.click(screen.getByText("Left subtree"));
      expect(screen.getByText(/1 of 3 Answered/i)).toBeInTheDocument();

      // Click Reset Answers
      fireEvent.click(screen.getByRole("button", { name: /Reset Answers/i }));
      expect(screen.getByText("Reset Quiz Answers?")).toBeInTheDocument();

      // Cancel reset
      fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
      expect(screen.getByText(/1 of 3 Answered/i)).toBeInTheDocument();

      // Click Reset Answers again and confirm
      fireEvent.click(screen.getByRole("button", { name: /Reset Answers/i }));
      const resetConfirmButtons = screen.getAllByRole("button", { name: /Reset Answers/i });
      fireEvent.click(resetConfirmButtons[resetConfirmButtons.length - 1]!);

      // All answers cleared
      expect(screen.getByText(/0 of 3 Answered/i)).toBeInTheDocument();
    });

    it("supports Back to Quiz Setup and Try Again with question count preserved", async () => {
      const onGenerate = vi.fn().mockResolvedValue(mockQuiz);
      render(
        <QuizTab
          quiz={mockQuiz}
          isLoading={false}
          isGenerating={false}
          isError={false}
          onGenerateQuiz={onGenerate}
          onRetry={vi.fn()}
        />
      );

      // Complete and submit
      fireEvent.click(screen.getByText("Left subtree"));
      fireEvent.click(screen.getByText("O(log n)"));
      fireEvent.click(screen.getByText("2"));
      fireEvent.click(screen.getByRole("button", { name: /Submit Quiz/i }));
      fireEvent.click(screen.getByRole("button", { name: /Confirm Submission/i }));

      await waitFor(() => {
        expect(screen.getByText("Your Assessment Results")).toBeInTheDocument();
      });

      // Click "Try Again"
      const tryAgainBtn = screen.getByRole("button", { name: /Try Again with New Quiz/i });
      fireEvent.click(tryAgainBtn);

      // Setup screen appears
      expect(screen.getByText("Generate AI Practice Quiz")).toBeInTheDocument();

      // Verify question count is preserved and can start a new quiz
      fireEvent.click(screen.getByRole("button", { name: /10 Questions/i }));
      fireEvent.click(screen.getByRole("button", { name: /Start Quiz/i }));
      expect(onGenerate).toHaveBeenCalledWith(10);
    });

    it("automatically scrolls to the top of Assessment Results upon submission", async () => {
      const scrollIntoViewMock = vi.fn();
      window.HTMLElement.prototype.scrollIntoView = scrollIntoViewMock;

      render(
        <QuizTab
          quiz={mockQuiz}
          isLoading={false}
          isGenerating={false}
          isError={false}
          onGenerateQuiz={vi.fn()}
          onRetry={vi.fn()}
        />
      );

      // Answer all questions
      fireEvent.click(screen.getByText("Left subtree"));
      fireEvent.click(screen.getByText("O(log n)"));
      fireEvent.click(screen.getByText("2"));

      // Submit
      fireEvent.click(screen.getByRole("button", { name: /Submit Quiz/i }));
      fireEvent.click(screen.getByRole("button", { name: /Confirm Submission/i }));

      await waitFor(() => {
        expect(screen.getByText("Your Assessment Results")).toBeInTheDocument();
      });

      // Verify scrollIntoView was called with smooth behavior and start block
      expect(scrollIntoViewMock).toHaveBeenCalledWith(
        expect.objectContaining({
          behavior: "smooth",
          block: "start",
        })
      );
    });
  });
});
