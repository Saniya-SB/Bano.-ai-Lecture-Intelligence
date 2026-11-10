"use client";

import React, { Suspense, useState, useCallback } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Upload, Mic, Youtube, ArrowLeft, ArrowRight, Loader2 } from "lucide-react";

import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { InlineAlert } from "@/components/shared/inline-alert";
import { FileDropzone } from "@/components/shared/file-dropzone";

import { ROUTES } from "@/config/routes";
import { FEATURES } from "@/config/features";
import { lectureService } from "@/services/lecture-service";
import {
  lectureMetadataSchema,
  youtubeInputSchema,
  parseYouTubeVideoId,
  type LectureMetadataValues,
  type YouTubeInputValues,
} from "@/features/lecture-input/schemas/lecture-input.schema";
import { getErrorMessage } from "@/lib/error-messages";

// ---------------------------------------------------------------------------
// Lazy-load AudioRecorder — only runs in browser, never on SSR.
// The loading skeleton mirrors the dropzone height.
// ---------------------------------------------------------------------------
const AudioRecorder = dynamic(
  () => import("@/components/shared/audio-recorder").then((m) => m.AudioRecorder),
  {
    ssr: false,
    loading: () => (
      <div className="flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-border p-10 text-center">
        <Loader2 className="h-6 w-6 animate-spin text-bano-text-muted" />
        <p className="text-xs text-bano-text-muted">Loading recorder…</p>
      </div>
    ),
  }
);

// ---------------------------------------------------------------------------
// Mode type
// ---------------------------------------------------------------------------
type InputMode = "upload" | "record" | "youtube";

function isValidMode(v: string | null): v is InputMode {
  return v === "upload" || v === "record" || v === "youtube";
}

// ---------------------------------------------------------------------------
// Upload progress bar
// ---------------------------------------------------------------------------
function UploadProgressBar({ percent }: { percent: number }) {
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-xs text-bano-text-muted">
        <span>Uploading…</span>
        <span className="font-mono">{percent}%</span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-bano-surface-sunken overflow-hidden">
        <div
          className="h-full bg-bano-accent rounded-full transition-all duration-300"
          style={{ width: `${percent}%` }}
          role="progressbar"
          aria-valuenow={percent}
          aria-valuemin={0}
          aria-valuemax={100}
        />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Shared metadata fields — used by all three mode panels
// ---------------------------------------------------------------------------
function MetadataFields({
  register,
  errors,
  disabled,
}: {
  register: ReturnType<typeof useForm<LectureMetadataValues>>["register"];
  errors: ReturnType<typeof useForm<LectureMetadataValues>>["formState"]["errors"];
  disabled: boolean;
}) {
  return (
    <div className="space-y-4 pt-4 border-t border-border">
      <div className="space-y-1.5">
        <Label htmlFor="lecture-title">Lecture title <span aria-hidden>*</span></Label>
        <Input
          id="lecture-title"
          placeholder="e.g. Data Structures – Binary Search Trees"
          disabled={disabled}
          aria-invalid={!!errors.title}
          {...register("title")}
        />
        {errors.title && <p className="text-xs text-danger" role="alert">{errors.title.message}</p>}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="lecture-subject">Subject <span aria-hidden>*</span></Label>
        <Input
          id="lecture-subject"
          placeholder="e.g. Computer Science"
          disabled={disabled}
          aria-invalid={!!errors.subject}
          {...register("subject")}
        />
        {errors.subject && <p className="text-xs text-danger" role="alert">{errors.subject.message}</p>}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="lecture-topic">
          Topic <span className="text-bano-text-muted text-xs font-normal">(optional)</span>
        </Label>
        <Input
          id="lecture-topic"
          placeholder="e.g. Tree Traversals and Complexity"
          disabled={disabled}
          {...register("topic")}
        />
        {errors.topic && <p className="text-xs text-danger" role="alert">{errors.topic.message}</p>}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Upload panel
// ---------------------------------------------------------------------------
function UploadPanel() {
  const router = useRouter();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadPercent, setUploadPercent] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<LectureMetadataValues>({
    resolver: zodResolver(lectureMetadataSchema),
    mode: "onChange",
  });

  const titleVal = watch("title", "");
  const subjectVal = watch("subject", "");
  const isValid = Boolean(selectedFile && titleVal.trim() && subjectVal.trim() && !errors.title && !errors.subject);

  const onSubmit = useCallback(
    async (values: LectureMetadataValues) => {
      if (!selectedFile) {
        setServerError("Please select an audio or video file to upload.");
        return;
      }
      if (isUploading) return;
      setServerError(null);
      setIsUploading(true);
      setUploadPercent(0);
      try {
        const lecture = await lectureService.uploadFile(
          { ...values, file: selectedFile },
          (pct) => setUploadPercent(pct)
        );
        toast.success("Lecture uploaded! Processing will begin shortly.");
        router.push(ROUTES.LECTURE_PROCESSING(lecture.id));
      } catch (err) {
        setServerError(getErrorMessage(err));
        setIsUploading(false);
        setUploadPercent(0);
      }
    },
    [selectedFile, isUploading, router]
  );

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
      {serverError && <InlineAlert variant="danger">{serverError}</InlineAlert>}

      <FileDropzone
        selectedFile={selectedFile}
        onFileSelected={setSelectedFile}
        onFileCleared={() => setSelectedFile(null)}
        disabled={isUploading}
      />

      {isUploading && <UploadProgressBar percent={uploadPercent} />}

      <MetadataFields
        register={register}
        errors={errors}
        disabled={isUploading}
      />

      {/* Selected file preview */}
      {selectedFile && (
        <div className="rounded-lg border border-border bg-bano-surface-sunken p-3 text-xs space-y-1">
          <p className="font-semibold text-foreground flex items-center gap-1.5">
            <span className="text-bano-accent">●</span> Selected file: {selectedFile.name}
          </p>
          <p className="text-bano-text-muted">
            Size: {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB &bull; Type: {selectedFile.type || "audio/video"}
          </p>
        </div>
      )}

      <Button
        type="submit"
        className="w-full gap-2 bg-[#1F3A5F] text-white hover:bg-[#162B46] font-medium disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
        disabled={isUploading || !isValid}
      >
        {isUploading ? (
          <><Loader2 className="h-4 w-4 animate-spin" />Processing audio… ({uploadPercent}%)</>
        ) : (
          <><Upload className="h-4 w-4" />Process Lecture</>
        )}
      </Button>
    </form>
  );
}

// ---------------------------------------------------------------------------
// Record panel
// ---------------------------------------------------------------------------
function RecordPanel() {
  const router = useRouter();
  const [recordedBlob, setRecordedBlob] = useState<{ blob: Blob; mimeType: string } | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadPercent, setUploadPercent] = useState(0);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<LectureMetadataValues>({
    resolver: zodResolver(lectureMetadataSchema),
    mode: "onChange",
  });

  const titleVal = watch("title", "");
  const subjectVal = watch("subject", "");
  const isValid = Boolean(recordedBlob && titleVal.trim() && subjectVal.trim() && !errors.title && !errors.subject);

  const onSubmit = useCallback(
    async (values: LectureMetadataValues) => {
      if (!recordedBlob) {
        setServerError("Please record audio before submitting.");
        return;
      }
      if (isUploading) return;
      setServerError(null);
      setIsUploading(true);
      setUploadPercent(0);
      try {
        const lecture = await lectureService.uploadRecording(
          { ...values, ...recordedBlob },
          (pct) => setUploadPercent(pct)
        );
        toast.success("Recording uploaded! Processing will begin shortly.");
        router.push(ROUTES.LECTURE_PROCESSING(lecture.id));
      } catch (err) {
        setServerError(getErrorMessage(err));
        setIsUploading(false);
        setUploadPercent(0);
      }
    },
    [recordedBlob, isUploading, router]
  );

  if (!FEATURES.browserRecording) {
    return (
      <InlineAlert variant="info">
        Browser recording is not yet available in production. Please use the{" "}
        <strong>Upload File</strong> mode or check back after backend confirmation.
      </InlineAlert>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
      {serverError && <InlineAlert variant="danger">{serverError}</InlineAlert>}

      <AudioRecorder
        onRecordingReady={(blob, mimeType) => setRecordedBlob({ blob, mimeType })}
        onRecordingCleared={() => setRecordedBlob(null)}
        disabled={isUploading}
      />

      {isUploading && <UploadProgressBar percent={uploadPercent} />}

      {recordedBlob && (
        <div className="rounded-lg border border-border bg-bano-surface-sunken p-3 text-xs space-y-1">
          <p className="font-semibold text-foreground flex items-center gap-1.5">
            <span className="text-bano-accent">●</span> Recorded audio clip ready
          </p>
          <p className="text-bano-text-muted">
            Format: {recordedBlob.mimeType} &bull; Size: {(recordedBlob.blob.size / 1024).toFixed(1)} KB
          </p>
        </div>
      )}

      {recordedBlob && (
        <MetadataFields
          register={register}
          errors={errors}
          disabled={isUploading}
        />
      )}

      {recordedBlob && (
        <Button
          type="submit"
          className="w-full gap-2 bg-[#1F3A5F] text-white hover:bg-[#162B46] font-medium disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
          disabled={isUploading || !isValid}
        >
          {isUploading ? (
            <><Loader2 className="h-4 w-4 animate-spin" />Processing audio… ({uploadPercent}%)</>
          ) : (
            <><Mic className="h-4 w-4" />Process Lecture</>
          )}
        </Button>
      )}
    </form>
  );
}

// ---------------------------------------------------------------------------
// YouTube panel
// ---------------------------------------------------------------------------
function YouTubePanel() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<YouTubeInputValues>({ resolver: zodResolver(youtubeInputSchema) });

  const youtubeUrl = watch("youtubeUrl", "");
  const videoId = parseYouTubeVideoId(youtubeUrl);

  const onSubmit = useCallback(
    async (values: YouTubeInputValues) => {
      setServerError(null);
      setIsSubmitting(true);
      try {
        const lecture = await lectureService.createYoutubeLecture({
          title: values.title,
          subject: values.subject,
          topic: values.topic,
          youtubeUrl: values.youtubeUrl,
        });
        toast.success("YouTube lecture added! Processing will begin shortly.");
        router.push(ROUTES.LECTURE_PROCESSING(lecture.id));
      } catch (err) {
        setServerError(getErrorMessage(err));
        setIsSubmitting(false);
      }
    },
    [router]
  );

  if (!FEATURES.youtubeIngestion) {
    return (
      <InlineAlert variant="info">
        YouTube ingestion is not yet available in production. This feature will be enabled once
        the backend confirms the caption/audio extraction contract.
      </InlineAlert>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
      {serverError && <InlineAlert variant="danger">{serverError}</InlineAlert>}

      <div className="space-y-1.5">
        <Label htmlFor="youtube-url">YouTube URL <span aria-hidden>*</span></Label>
        <Input
          id="youtube-url"
          type="url"
          placeholder="https://www.youtube.com/watch?v=..."
          aria-invalid={!!errors.youtubeUrl}
          disabled={isSubmitting}
          {...register("youtubeUrl")}
        />
        {errors.youtubeUrl && (
          <p className="text-xs text-danger" role="alert">{errors.youtubeUrl.message}</p>
        )}
        {/* Live validation feedback — shows the video ID when recognised */}
        {videoId && !errors.youtubeUrl && (
          <p className="text-xs text-bano-success font-mono">
            ✓ Video ID: {videoId}
          </p>
        )}
        <p className="text-xs text-bano-text-muted">
          Supported: youtube.com/watch?v=…, youtu.be/…, /shorts/… — no downloading or scraping.
        </p>
      </div>

      <MetadataFields
        register={register as unknown as ReturnType<typeof useForm<LectureMetadataValues>>["register"]}
        errors={errors as ReturnType<typeof useForm<LectureMetadataValues>>["formState"]["errors"]}
        disabled={isSubmitting}
      />

      <Button type="submit" className="w-full gap-2" disabled={isSubmitting}>
        {isSubmitting ? (
          <><Loader2 className="h-4 w-4 animate-spin" />Submitting…</>
        ) : (
          <><Youtube className="h-4 w-4" />Submit YouTube Lecture</>
        )}
      </Button>
    </form>
  );
}

// ---------------------------------------------------------------------------
// Mode selector tabs
// ---------------------------------------------------------------------------
const MODES: { id: InputMode; label: string; icon: React.ElementType; description: string }[] = [
  { id: "upload", label: "Upload File", icon: Upload, description: "MP3, WAV, M4A, MP4, WEBM" },
  { id: "record", label: "Record in Browser", icon: Mic, description: "Direct microphone capture" },
  { id: "youtube", label: "YouTube Link", icon: Youtube, description: "Permitted captions / audio" },
];

// ---------------------------------------------------------------------------
// Inner component that uses useSearchParams (must be in Suspense)
// ---------------------------------------------------------------------------
function NewLectureInner() {
  const searchParams = useSearchParams();
  const rawMode = searchParams.get("mode");
  const [activeMode, setActiveMode] = useState<InputMode>(
    isValidMode(rawMode) ? rawMode : "upload"
  );

  return (
    <div className="space-y-6 max-w-2xl">
      <PageHeader
        title="Add a Lecture"
        description="Choose how you want to add your lecture for AI processing."
        action={
          <Button asChild variant="ghost" size="sm" className="gap-1.5 text-bano-text-muted">
            <Link href={ROUTES.LECTURES}>
              <ArrowLeft className="h-4 w-4" />
              Back to History
            </Link>
          </Button>
        }
      />

      {/* Mode selector */}
      <div
        role="tablist"
        aria-label="Lecture input mode"
        className="grid grid-cols-1 sm:grid-cols-3 gap-3"
      >
        {MODES.map(({ id, label, icon: Icon, description }) => {
          const isActive = activeMode === id;
          return (
            <button
              key={id}
              role="tab"
              aria-selected={isActive}
              type="button"
              onClick={() => setActiveMode(id)}
              className={cn(
                "flex flex-col items-center gap-2 rounded-xl border p-5 text-center transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                isActive
                  ? "border-bano-accent bg-bano-accent-soft shadow-sm"
                  : "border-border bg-card hover:border-bano-accent/40 hover:bg-bano-accent-soft/20"
              )}
            >
              <div
                className={cn(
                  "flex h-10 w-10 items-center justify-center rounded-full",
                  isActive ? "bg-bano-accent text-white" : "bg-bano-surface-sunken text-bano-text-muted"
                )}
              >
                <Icon className="h-5 w-5" aria-hidden />
              </div>
              <div>
                <p className={cn("text-sm font-semibold font-heading", isActive ? "text-bano-accent" : "text-foreground")}>
                  {label}
                </p>
                <p className="text-[11px] text-bano-text-muted mt-0.5">{description}</p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Active panel */}
      <Card className="p-6" role="tabpanel">
        {activeMode === "upload" && <UploadPanel />}
        {activeMode === "record" && <RecordPanel />}
        {activeMode === "youtube" && <YouTubePanel />}
      </Card>
    </div>
  );
}

function cn(...classes: (string | boolean | undefined | null)[]) {
  return classes.filter(Boolean).join(" ");
}

// ---------------------------------------------------------------------------
// Page export — Suspense required for useSearchParams in Next.js 15
// ---------------------------------------------------------------------------
export default function NewLecturePage() {
  return (
    <Suspense>
      <NewLectureInner />
    </Suspense>
  );
}
