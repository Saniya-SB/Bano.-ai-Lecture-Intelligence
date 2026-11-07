import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import React from "react";
import { TranscriptViewer } from "@/features/transcript/components/transcript-viewer";
import { Transcript } from "@/types/domain/transcript";
import { mapTranscriptDtoToDomain } from "@/services/adapters/transcript-adapter";
import { TranscriptDto } from "@/types/api/transcript";

const mockClassifiedTranscript: Transcript = {
  id: "tr_test_classified",
  lectureId: "lec_101",
  availableScripts: ["devanagari", "roman"],
  segments: [
    {
      id: "seg_concept",
      segmentIndex: 0,
      startTime: 0,
      endTime: 10,
      textDevanagari: "यह एक मुख्य सिद्धांत है।",
      textRoman: "Yeh ek mukhya concept hai.",
      segmentType: "concept",
    },
    {
      id: "seg_example",
      segmentIndex: 1,
      startTime: 10,
      endTime: 20,
      textDevanagari: "उदाहरण के लिए ट्री देखें।",
      textRoman: "Example ke liye tree dekhein.",
      segmentType: "example",
    },
    {
      id: "seg_admin",
      segmentIndex: 2,
      startTime: 20,
      endTime: 30,
      textDevanagari: "असाइनमेंट पोर्टल पर अपलोड करें।",
      textRoman: "Assignment portal par upload karein.",
      segmentType: "admin",
    },
    {
      id: "seg_offtopic",
      segmentIndex: 3,
      startTime: 30,
      endTime: 40,
      textDevanagari: "समोसे बहुत अच्छे हैं।",
      textRoman: "Samose bahut achhe hain.",
      segmentType: "off_topic",
    },
  ],
};

describe("Transcript Segment Classification", () => {
  it("renders distinct badges for concept, example, announcement, and off-topic", () => {
    render(<TranscriptViewer transcript={mockClassifiedTranscript} />);

    expect(screen.getByText("Concept")).toBeInTheDocument();
    expect(screen.getByText("Example")).toBeInTheDocument();
    expect(screen.getByText("Announcement")).toBeInTheDocument();
    expect(screen.getByText("Off-Topic")).toBeInTheDocument();
  });

  it("never deletes off-topic segments, initially collapses them with notice, and allows expanding", () => {
    render(<TranscriptViewer transcript={mockClassifiedTranscript} />);

    // Off-topic notice visible
    expect(
      screen.getByText(/Off-topic discussion hidden/i)
    ).toBeInTheDocument();

    // The text itself is hidden initially
    expect(screen.queryByText("समोसे बहुत अच्छे हैं।")).not.toBeInTheDocument();

    // Click "Expand off-topic segment"
    const toggleBtn = screen.getByRole("button", { name: /Expand off-topic segment/i });
    fireEvent.click(toggleBtn);

    // Now text is visible
    expect(screen.getByText("समोसे बहुत अच्छे हैं।")).toBeInTheDocument();

    // Click collapse
    const collapseBtn = screen.getByRole("button", { name: /Collapse off-topic segment/i });
    fireEvent.click(collapseBtn);
    expect(screen.queryByText("समोसे बहुत अच्छे हैं।")).not.toBeInTheDocument();
  });

  it("defaults missing segment_type to concept gracefully in adapter", () => {
    const rawDto: TranscriptDto = {
      id: "tr_missing_type",
      lecture_id: "lec_missing",
      available_scripts: ["roman"],
      segments: [
        {
          id: "seg_no_type",
          start_time: 0,
          end_time: 10,
          text_roman: "Unclassified text",
        },
      ],
    };

    const domain = mapTranscriptDtoToDomain(rawDto);
    expect(domain.segments[0]?.segmentType).toBe("concept");
  });
});
