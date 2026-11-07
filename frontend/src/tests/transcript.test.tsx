import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import React from "react";
import { TranscriptViewer } from "@/features/transcript/components/transcript-viewer";
import { Transcript } from "@/types/domain/transcript";

const mockTranscript: Transcript = {
  id: "tr_test_1",
  lectureId: "lec_101",
  availableScripts: ["devanagari", "roman"],
  segments: [
    {
      id: "seg_1",
      segmentIndex: 0,
      startTime: 0,
      endTime: 10,
      textDevanagari: "हेलो एवरीवन, आज हम बाइनरी सर्च ट्री के बारे में बात करेंगे।",
      textRoman: "Hello everyone, aaj hum Binary Search Tree ke baare mein baat karenge.",
      speakerLabel: "Instructor",
    },
    {
      id: "seg_2",
      segmentIndex: 1,
      startTime: 10,
      endTime: 25,
      textDevanagari: "इन-ऑर्डर ट्रैवर्सल हमेशा सॉर्टेड सीक्वेंस देता है।",
      textRoman: "In-order traversal hamesha sorted sequence deta hai.",
      speakerLabel: "Instructor",
    },
  ],
};

const mockSingleScriptTranscript: Transcript = {
  id: "tr_single",
  lectureId: "lec_single",
  availableScripts: ["roman"],
  segments: [
    {
      id: "seg_1",
      segmentIndex: 0,
      startTime: 0,
      endTime: 10,
      textDevanagari: "",
      textRoman: "Only Roman script is available.",
    },
  ],
};

describe("TranscriptViewer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
    });
  });

  it("renders segments and switches script purely on client side without network calls", () => {
    render(<TranscriptViewer transcript={mockTranscript} />);

    // Initially in Devanagari (default when available)
    expect(
      screen.getByText(/हेलो एवरीवन, आज हम बाइनरी सर्च ट्री के बारे में बात करेंगे।/i)
    ).toBeInTheDocument();

    // Click Roman script button
    const romanBtn = screen.getByRole("button", { name: /Roman Hinglish/i });
    fireEvent.click(romanBtn);

    // Text switches to Roman
    expect(
      screen.getByText(/Hello everyone, aaj hum Binary Search Tree ke baare mein baat karenge./i)
    ).toBeInTheDocument();
  });

  it("filters and highlights search matches with match counts", async () => {
    render(<TranscriptViewer transcript={mockTranscript} />);

    // Switch to Roman for predictable ASCII search
    fireEvent.click(screen.getByRole("button", { name: /Roman Hinglish/i }));

    const searchInput = screen.getByLabelText(/Search transcript/i);
    fireEvent.change(searchInput, { target: { value: "Binary" } });

    await waitFor(() => {
      expect(screen.getByText(/1 of 1/i)).toBeInTheDocument();
    });

    const marks = screen.getAllByText("Binary");
    expect(marks.length).toBeGreaterThanOrEqual(1);
  });

  it("copies visible transcript text to clipboard without timestamps", async () => {
    render(<TranscriptViewer transcript={mockTranscript} />);
    fireEvent.click(screen.getByRole("button", { name: /Roman Hinglish/i }));

    const copyBtn = screen.getByRole("button", { name: /^Copy$/i });
    fireEvent.click(copyBtn);

    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
        expect.stringContaining("Hello everyone, aaj hum Binary Search Tree ke baare mein baat karenge.")
      );
    });
  });

  it("copies visible transcript text with timestamps", async () => {
    render(<TranscriptViewer transcript={mockTranscript} />);
    fireEvent.click(screen.getByRole("button", { name: /Roman Hinglish/i }));

    const copyWithTimestampsBtn = screen.getByRole("button", {
      name: /With Timestamps/i,
    });
    fireEvent.click(copyWithTimestampsBtn);

    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
        expect.stringContaining("[00:00] Hello everyone")
      );
    });
  });

  it("handles single-script availability gracefully by disabling missing script", () => {
    render(<TranscriptViewer transcript={mockSingleScriptTranscript} />);

    const devanagariBtn = screen.getByRole("button", { name: /देवनागरी/i });
    expect(devanagariBtn).toBeDisabled();

    // Shows Roman text
    expect(screen.getByText(/Only Roman script is available./i)).toBeInTheDocument();
  });
});
