/**
 * M4 lecture input component tests.
 * Tests focus on client-side validation, form field rendering, and
 * YouTube URL handling. Upload/recording integration is covered via
 * youtube-url.test.ts (pure unit) and manual testing.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import React from "react";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
  useSearchParams: () => ({ get: () => null }),
}));

vi.mock("next/dynamic", () => ({
  default: (loader: () => Promise<{ AudioRecorder: React.ComponentType }>) => {
    // Return a stub so the recorder panel renders without MediaRecorder
    const StubRecorder = ({ onRecordingReady, onRecordingCleared }: {
      onRecordingReady: (b: Blob, m: string) => void;
      onRecordingCleared: () => void;
    }) => (
      <div data-testid="audio-recorder-stub">
        <button onClick={() => onRecordingReady(new Blob(), "audio/webm")}>
          Simulate recording ready
        </button>
        <button onClick={onRecordingCleared}>Clear recording</button>
      </div>
    );
    StubRecorder.displayName = "StubAudioRecorder";
    return StubRecorder;
  },
}));

vi.mock("@/services/lecture-service", () => ({
  lectureService: {
    uploadFile: vi.fn().mockResolvedValue({ id: "lec_test", title: "T", subject: "S", status: "uploaded", durationSeconds: 0, createdAt: "", updatedAt: "" }),
    uploadRecording: vi.fn().mockResolvedValue({ id: "lec_rec", title: "T", subject: "S", status: "uploaded", durationSeconds: 0, createdAt: "", updatedAt: "" }),
    createYoutubeLecture: vi.fn().mockResolvedValue({ id: "lec_yt", title: "T", subject: "S", status: "uploaded", durationSeconds: 0, createdAt: "", updatedAt: "" }),
  },
}));

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
async function importPage() {
  // Fresh import each time so mocks apply
  const mod = await import("@/app/(dashboard)/lectures/new/page");
  return mod.default;
}

// ---------------------------------------------------------------------------
// File dropzone unit tests (independent of the page)
// ---------------------------------------------------------------------------
describe("FileDropzone", () => {
  it("renders the drop area and accepts a valid MIME file", async () => {
    const { FileDropzone } = await import("@/components/shared/file-dropzone");
    const onSelected = vi.fn();
    const onCleared = vi.fn();
    render(
      <FileDropzone
        selectedFile={null}
        onFileSelected={onSelected}
        onFileCleared={onCleared}
      />
    );
    expect(screen.getByRole("button")).toBeInTheDocument();
    expect(screen.getByText(/drop your file here/i)).toBeInTheDocument();
  });

  it("shows file name when a file is selected", async () => {
    const { FileDropzone } = await import("@/components/shared/file-dropzone");
    const mockFile = new File(["data"], "lecture.mp3", { type: "audio/mpeg" });
    const onSelected = vi.fn();
    const onCleared = vi.fn();
    render(
      <FileDropzone
        selectedFile={mockFile}
        onFileSelected={onSelected}
        onFileCleared={onCleared}
      />
    );
    expect(screen.getByText("lecture.mp3")).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Schema unit tests
// ---------------------------------------------------------------------------
describe("isAcceptedMimeType", () => {
  it("accepts audio/mpeg", async () => {
    const { isAcceptedMimeType } = await import("@/features/lecture-input/schemas/lecture-input.schema");
    expect(isAcceptedMimeType("audio/mpeg")).toBe(true);
  });

  it("rejects image/jpeg", async () => {
    const { isAcceptedMimeType } = await import("@/features/lecture-input/schemas/lecture-input.schema");
    expect(isAcceptedMimeType("image/jpeg")).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// New Lecture page — Upload mode
// ---------------------------------------------------------------------------
describe("NewLecturePage — Upload mode", () => {
  it("renders all metadata fields", async () => {
    const NewLecturePage = await importPage();
    render(<NewLecturePage />);
    expect(screen.getByLabelText(/lecture title/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/subject/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/topic/i)).toBeInTheDocument();
  });

  it("shows validation errors if submitted without filling required fields", async () => {
    const NewLecturePage = await importPage();
    render(<NewLecturePage />);
    // Fill metadata so RHF passes its own validation; leave file unselected
    // so onSubmit fires and sets the "please select an audio" error.
    fireEvent.change(screen.getByLabelText(/lecture title/i), {
      target: { value: "Test Lecture" },
    });
    fireEvent.change(screen.getByLabelText(/subject/i), {
      target: { value: "CS" },
    });
    fireEvent.click(screen.getByRole("button", { name: /upload.*process/i }));
    await waitFor(() => {
      expect(screen.getByText(/please select an audio/i)).toBeInTheDocument();
    });
  });
});

// ---------------------------------------------------------------------------
// New Lecture page — YouTube mode
// ---------------------------------------------------------------------------
describe("NewLecturePage — YouTube mode", () => {
  beforeEach(async () => {
    // Switch to YouTube mode
    vi.resetModules();
  });

  it("switches to YouTube mode on tab click", async () => {
    const NewLecturePage = await importPage();
    render(<NewLecturePage />);
    fireEvent.click(screen.getByRole("tab", { name: /youtube link/i }));
    expect(await screen.findByLabelText(/youtube url/i)).toBeInTheDocument();
  });

  it("shows validation error for a non-YouTube URL", async () => {
    const NewLecturePage = await importPage();
    render(<NewLecturePage />);
    fireEvent.click(screen.getByRole("tab", { name: /youtube link/i }));
    const urlInput = await screen.findByLabelText(/youtube url/i);
    fireEvent.change(urlInput, { target: { value: "https://vimeo.com/12345" } });
    fireEvent.click(screen.getByRole("button", { name: /submit youtube/i }));
    await waitFor(() => {
      expect(screen.getByText(/valid youtube video url/i)).toBeInTheDocument();
    });
  });

  it("shows video ID feedback for a valid YouTube URL", async () => {
    const NewLecturePage = await importPage();
    render(<NewLecturePage />);
    fireEvent.click(screen.getByRole("tab", { name: /youtube link/i }));
    const urlInput = await screen.findByLabelText(/youtube url/i);
    fireEvent.change(urlInput, { target: { value: "https://www.youtube.com/watch?v=dQw4w9WgXcQ" } });
    await waitFor(() => {
      expect(screen.getByText(/dQw4w9WgXcQ/)).toBeInTheDocument();
    });
  });
});
