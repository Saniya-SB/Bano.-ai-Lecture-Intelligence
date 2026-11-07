import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import React from "react";
import {
  ProcessingStepper,
  ORDERED_STAGES,
} from "@/features/processing/components/processing-stepper";

describe("ProcessingStepper", () => {
  it("renders all 7 documented stages", () => {
    render(<ProcessingStepper currentStage="uploading" />);
    for (const stage of ORDERED_STAGES) {
      expect(screen.getByText(stage.label)).toBeInTheDocument();
    }
  });

  it("marks past stages as completed and current stage as active", () => {
    render(
      <ProcessingStepper
        currentStage="transcribing"
        progressPercent={45}
      />
    );

    // Completed indicators for uploading, validating, preparing_audio
    const completedIcons = screen.getAllByLabelText("Completed");
    expect(completedIcons.length).toBe(3);

    // Active indicator for transcribing
    const inProgressIcon = screen.getByLabelText("In Progress");
    expect(inProgressIcon).toBeInTheDocument();

    // Explicit progress percent displayed
    expect(screen.getByText("45%")).toBeInTheDocument();
  });

  it("shows indeterminate Running text when progressPercent is not provided", () => {
    render(<ProcessingStepper currentStage="preparing_audio" />);
    expect(screen.getByText("Running...")).toBeInTheDocument();
  });

  it("renders failure state alert and error message", () => {
    render(
      <ProcessingStepper
        currentStage="failed"
        errorMessage="Audio stream was truncated or corrupted during upload."
      />
    );
    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.getByText("Processing Failed")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Audio stream was truncated or corrupted during upload."
      )
    ).toBeInTheDocument();
  });

  it("handles unknown stage gracefully without throwing", () => {
    // @ts-expect-error Testing unknown stage fallback
    render(<ProcessingStepper currentStage="unexpected_future_stage" />);
    expect(screen.getByText("Uploading")).toBeInTheDocument();
  });
});
