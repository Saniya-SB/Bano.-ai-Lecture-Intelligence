import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import React from "react";
import { Lecture } from "@/types/domain/common";

const mockLectures: Lecture[] = [
  {
    id: "lec_1",
    title: "Data Structures - Binary Trees",
    subject: "Computer Science",
    topic: "Tree Traversals",
    durationSeconds: 2840,
    status: "completed",
    createdAt: "2026-11-04T09:30:00Z",
    updatedAt: "2026-11-04T10:20:00Z",
  },
  {
    id: "lec_2",
    title: "Operating Systems - Scheduling",
    subject: "Computer Science",
    topic: "Round Robin",
    durationSeconds: 3600,
    status: "transcribing",
    createdAt: "2026-11-04T11:15:00Z",
    updatedAt: "2026-11-04T11:45:00Z",
  },
];

let mockReturnState = {
  lectures: mockLectures,
  isLoading: false,
  isError: false,
  error: null as Error | null,
  refetch: vi.fn(),
};

vi.mock("@/hooks/use-lectures", () => ({
  useLectures: () => mockReturnState,
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
  useSearchParams: () => ({ get: () => null }),
}));

describe("DashboardPage", () => {
  it("renders lecture statistics correctly based on data", async () => {
    mockReturnState = {
      lectures: mockLectures,
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    };

    const { default: DashboardPage } = await import(
      "@/app/(dashboard)/dashboard/page"
    );
    render(<DashboardPage />);

    expect(screen.getByText(/Meri Lectures/i)).toBeInTheDocument();
    expect(screen.getByText("Data Structures - Binary Trees")).toBeInTheDocument();
  });

  it("renders empty state when there are 0 lectures", async () => {
    mockReturnState = {
      lectures: [],
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    };

    const { default: DashboardPage } = await import(
      "@/app/(dashboard)/dashboard/page"
    );
    render(<DashboardPage />);

    expect(screen.getByText(/Abhi koi lecture nahi/i)).toBeInTheDocument();
  });
});

describe("LecturesPage", () => {
  it("renders lecture list and filters by search query", async () => {
    mockReturnState = {
      lectures: mockLectures,
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    };

    const { default: LecturesPage } = await import(
      "@/app/(dashboard)/lectures/page"
    );
    render(<LecturesPage />);

    expect(screen.getByText("Data Structures - Binary Trees")).toBeInTheDocument();
    expect(screen.getByText("Operating Systems - Scheduling")).toBeInTheDocument();

    // Type in search box
    const searchInput = screen.getByPlaceholderText(/Search by title/i);
    fireEvent.change(searchInput, { target: { value: "Binary" } });

    expect(screen.getByText("Data Structures - Binary Trees")).toBeInTheDocument();
    expect(screen.queryByText("Operating Systems - Scheduling")).not.toBeInTheDocument();
  });

  it("filters by status pill", async () => {
    mockReturnState = {
      lectures: mockLectures,
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    };

    const { default: LecturesPage } = await import(
      "@/app/(dashboard)/lectures/page"
    );
    render(<LecturesPage />);

    const completedFilter = screen.getByRole("button", { name: /^Completed$/i });
    fireEvent.click(completedFilter);

    expect(screen.getByText("Data Structures - Binary Trees")).toBeInTheDocument();
    expect(screen.queryByText("Operating Systems - Scheduling")).not.toBeInTheDocument();
  });
});
