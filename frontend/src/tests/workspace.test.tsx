import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import React from "react";
import { LectureWorkspaceInner } from "@/features/workspace/components/lecture-workspace-inner";
import { Lecture } from "@/types/domain/common";

const mockLecture: Lecture = {
  id: "lec_101",
  title: "Data Structures - Binary Search Trees",
  subject: "Computer Science",
  topic: "BST Traversals",
  durationSeconds: 2840,
  status: "completed",
  createdAt: "2026-11-04T09:30:00Z",
  updatedAt: "2026-11-04T10:20:00Z",
};

const mockIncompleteLecture: Lecture = {
  ...mockLecture,
  id: "lec_104",
  status: "transcribing",
};

let currentTab = "overview";
const mockPush = vi.fn();
const mockReplace = vi.fn((url: string) => {
  const match = url.match(/tab=([a-z]+)/);
  if (match && match[1]) currentTab = match[1];
});

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush, replace: mockReplace }),
  useSearchParams: () => ({
    get: (key: string) => (key === "tab" ? currentTab : null),
  }),
}));

vi.mock("@/hooks/use-lectures", () => ({
  useLectures: () => ({
    lectures: [mockLecture, mockIncompleteLecture],
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  }),
}));

vi.mock("@/hooks/use-transcript", () => ({
  useTranscript: () => ({
    transcript: {
      id: "tr_101",
      lectureId: "lec_101",
      availableScripts: ["devanagari", "roman"],
      segments: [
        {
          id: "seg_1",
          segmentIndex: 0,
          startTime: 0,
          endTime: 10,
          textDevanagari: "टेस्ट देवनागरी",
          textRoman: "Test Roman",
        },
      ],
    },
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  }),
}));

describe("LectureWorkspacePage", () => {
  it("renders lecture header and all 6 tabs", () => {
    currentTab = "overview";
    render(<LectureWorkspaceInner lectureId="lec_101" />);

    expect(screen.getByText("Data Structures - Binary Search Trees")).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Overview" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Transcript" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Notes" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Summary" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Questions" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Quiz" })).toBeInTheDocument();
  });

  it("changes tab via URL query replacement when clicking a tab", () => {
    currentTab = "overview";
    render(<LectureWorkspaceInner lectureId="lec_101" />);

    const transcriptTab = screen.getByRole("tab", { name: "Transcript" });
    fireEvent.click(transcriptTab);

    expect(mockReplace).toHaveBeenCalledWith("/lectures/lec_101?tab=transcript");
  });

  it("shows non-completed processing banner when lecture is not complete", () => {
    currentTab = "overview";
    render(<LectureWorkspaceInner lectureId="lec_104" />);

    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.getByText(/Lecture is currently transcribing/i)).toBeInTheDocument();
    expect(screen.getByText(/View Live Status/i)).toBeInTheDocument();
  });

  it("renders M6 placeholder card when Notes tab is active", () => {
    currentTab = "notes";
    render(<LectureWorkspaceInner lectureId="lec_101" />);

    expect(screen.getByText(/Structured Smart Notes/i)).toBeInTheDocument();
    expect(
      screen.getByText(/Coming in Milestone 6: Learning Material/i)
    ).toBeInTheDocument();
  });
});
