import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import React from "react";
import BenchmarkPage from "@/app/(dashboard)/benchmark/page";
import * as benchmarkHook from "@/hooks/use-benchmark";
import { BenchmarkModelResult } from "@/types/domain/benchmark";

const mockSampleResults: BenchmarkModelResult[] = [
  {
    modelId: "m_whisper_large",
    modelName: "Whisper Large v3 (Hinglish fine-tuned)",
    wer: 14.2,
    cer: 7.8,
    technicalTermAccuracy: 91.5,
    meanLatency: 4.73,
    minLatency: 4.10,
    maxLatency: 5.50,
    totalCost: 0.12,
    isEstimated: false,
    source: "empirical",
    license: "MIT (fine-tune checkpoint)",
  },
  {
    modelId: "m_conformer",
    modelName: "Conformer-CTC Indic",
    wer: 18.7,
    cer: 9.6,
    technicalTermAccuracy: 84.0,
    meanLatency: 3.27,
    minLatency: 2.90,
    maxLatency: 3.80,
    totalCost: null, // Partial metric test
    isEstimated: true,
    source: "estimated",
    license: "Apache 2.0",
  },
];

describe("M7 Benchmark Page Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders empty state when there are 0 benchmark results", () => {
    vi.spyOn(benchmarkHook, "useBenchmark").mockReturnValue({
      results: [],
      details: [],
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    });

    render(<BenchmarkPage />);

    expect(screen.getByText("No benchmark results yet")).toBeInTheDocument();
    expect(
      screen.getByText(/Results appear here once an evaluation run has been completed/i)
    ).toBeInTheDocument();
  });

  it("renders loading state with skeleton placeholders", () => {
    vi.spyOn(benchmarkHook, "useBenchmark").mockReturnValue({
      results: [],
      details: [],
      isLoading: true,
      isError: false,
      error: null,
      refetch: vi.fn(),
    });

    render(<BenchmarkPage />);

    expect(screen.getByTestId("benchmark-loading")).toBeInTheDocument();
  });

  it("renders error state and handles retry action", () => {
    const mockRefetch = vi.fn();
    vi.spyOn(benchmarkHook, "useBenchmark").mockReturnValue({
      results: [],
      details: [],
      isLoading: false,
      isError: true,
      error: new Error("Network timeout fetching benchmark results"),
      refetch: mockRefetch,
    });

    render(<BenchmarkPage />);

    expect(
      screen.getByText("Benchmark data is unavailable right now")
    ).toBeInTheDocument();
    expect(
      screen.getByText("Network timeout fetching benchmark results")
    ).toBeInTheDocument();

    const retryBtn = screen.getByRole("button", { name: /Try again/i });
    expect(retryBtn).toBeInTheDocument();
    fireEvent.click(retryBtn);
    expect(mockRefetch).toHaveBeenCalledTimes(1);
  });

  it("renders comparison table with backend-returned metrics and handles missing metrics cleanly", () => {
    vi.spyOn(benchmarkHook, "useBenchmark").mockReturnValue({
      results: mockSampleResults,
      details: [],
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    });

    render(<BenchmarkPage />);

    // Table header and models
    expect(screen.getByText("Evaluation Comparison Matrix")).toBeInTheDocument();
    expect(
      screen.getByText("Whisper Large v3 (Hinglish fine-tuned)")
    ).toBeInTheDocument();
    expect(screen.getByText("Conformer-CTC Indic")).toBeInTheDocument();

    // Metric values from backend
    expect(screen.getAllByText("14.2%").length).toBeGreaterThan(0);
    expect(screen.getAllByText("91.5%").length).toBeGreaterThan(0);

    // Partial metric (estimatedCostUsd was null for Conformer) should show "Not reported"
    expect(screen.getAllByText("Not reported").length).toBeGreaterThan(0);

    // Best badge should highlight lowest WER
    expect(screen.getByText("Best")).toBeInTheDocument();
    // Top badge should highlight top accuracy
    expect(screen.getByText("Top")).toBeInTheDocument();
  });

  it("allows inspecting a specific model detail card", () => {
    vi.spyOn(benchmarkHook, "useBenchmark").mockReturnValue({
      results: mockSampleResults,
      details: [],
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    });

    render(<BenchmarkPage />);

    // By default first model profile is displayed
    expect(
      screen.getByText(/Model Profile: Whisper Large v3/i)
    ).toBeInTheDocument();

    // The inspect button for the second model
    const inspectBtn = screen.getByRole("button", { name: "Inspect" });
    fireEvent.click(inspectBtn);

    // Second model should now be active
    expect(
      screen.getByText(/Model Profile: Conformer-CTC Indic/i)
    ).toBeInTheDocument();
    expect(
      screen.getByText("Preliminary / Estimated Metrics")
    ).toBeInTheDocument();
  });
});
