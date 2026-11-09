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
  ],
};

describe("M6 Learning Materials Components", () => {
  describe("NotesTab", () => {
    it("renders headings, bullet points, and disclaimer without timestamp references", () => {
      render(
        <NotesTab
          materials={mockMaterials}
          isLoading={false}
          isError={false}
          onRetry={vi.fn()}
        />
      );

      expect(screen.getByText("BST Properties")).toBeInTheDocument();
      expect(screen.getByText("Left is smaller")).toBeInTheDocument();
      expect(screen.getByText("AI-generated synthesized study material.")).toBeInTheDocument();
      // Timestamp references were removed from frontend components per requirements
      expect(screen.queryByText("00:10 - 00:20")).not.toBeInTheDocument();
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

      expect(screen.getByText("Practice Quiz")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Quiz shuru karo/i })).toBeInTheDocument();

      // Change question count to 10
      fireEvent.click(screen.getByRole("button", { name: /10 Questions/i }));

      // Click start
      fireEvent.click(screen.getByRole("button", { name: /Quiz shuru karo/i }));
      expect(onGenerate).toHaveBeenCalledWith(10);
    });

    it("renders quiz options, handles answer selection, shows scoring, and displays backend explanation", () => {
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

      // Click correct option
      fireEvent.click(screen.getByText("Left subtree"));

      // Shows score and Correct feedback
      expect(screen.getByText(/Score: 1\/1/i)).toBeInTheDocument();
      expect(screen.getByText(/Correct/i)).toBeInTheDocument();

      // Explanation button appears
      const explBtn = screen.getByRole("button", { name: /Show Backend Explanation/i });
      expect(explBtn).toBeInTheDocument();

      // Click explanation
      fireEvent.click(explBtn);
      expect(
        screen.getByText("By BST definition, left subtree has smaller values.")
      ).toBeInTheDocument();
    });
  });
});
