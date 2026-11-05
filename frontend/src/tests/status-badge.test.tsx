import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { StatusBadge } from "@/components/shared/status-badge";
import { LectureStatus } from "@/types/domain/common";

describe("StatusBadge component", () => {
  const statuses: { status: LectureStatus; expectedText: string }[] = [
    { status: "uploaded", expectedText: "UPLOADED" },
    { status: "processing", expectedText: "PROCESSING" },
    { status: "transcribing", expectedText: "TRANSCRIBING" },
    { status: "generating_notes", expectedText: "GENERATING NOTES" },
    { status: "completed", expectedText: "COMPLETED" },
    { status: "failed", expectedText: "FAILED" },
  ];

  statuses.forEach(({ status, expectedText }) => {
    it(`renders status "${status}" with label "${expectedText}" and an icon`, () => {
      const { container } = render(<StatusBadge status={status} />);
      expect(screen.getByText(expectedText)).toBeInTheDocument();
      // Ensure it contains an SVG or pulsing element (icon + text, never colour alone)
      const hasIcon = container.querySelector("svg") || container.querySelector("span.relative");
      expect(hasIcon).toBeTruthy();
    });
  });

  it("handles unknown status gracefully", () => {
    render(<StatusBadge status={"unknown" as any} />);
    expect(screen.getByText("UNKNOWN")).toBeInTheDocument();
  });
});
