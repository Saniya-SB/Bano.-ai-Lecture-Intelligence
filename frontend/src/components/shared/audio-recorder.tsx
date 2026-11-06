"use client";

/**
 * AudioRecorder — browser MediaRecorder component.
 *
 * This file is intentionally designed to be loaded via next/dynamic
 * (lazy import) so it only runs in the browser. It is NOT imported
 * directly in any server component.
 *
 * Cleanup contract:
 *  - All MediaStream tracks are stopped on unmount and on each recording stop.
 *  - All object URLs created for audio preview are revoked on unmount and on clear.
 *  - No audio data persists after the component unmounts.
 */

import React, { useCallback, useEffect, useRef, useState } from "react";
import { Mic, Square, Play, Trash2, CheckCircle2, MicOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { DOMAIN_ERROR_MESSAGES } from "@/lib/error-messages";

export type RecorderState =
  | "idle"
  | "requesting"
  | "recording"
  | "reviewing"
  | "error";

interface RecorderError {
  kind: "permission-denied" | "unsupported" | "unknown";
  message: string;
}

export interface AudioRecorderProps {
  onRecordingReady: (blob: Blob, mimeType: string) => void;
  onRecordingCleared: () => void;
  disabled?: boolean;
  className?: string;
}

/** Select the best supported MIME type at runtime — no hard-coding. */
function getSupportedMimeType(): string {
  const candidates = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/ogg;codecs=opus",
    "audio/mp4",
  ];
  for (const type of candidates) {
    if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(type)) {
      return type;
    }
  }
  return ""; // browser will choose default
}

function formatElapsed(seconds: number): string {
  const m = Math.floor(seconds / 60).toString().padStart(2, "0");
  const s = (seconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

export function AudioRecorder({
  onRecordingReady,
  onRecordingCleared,
  disabled = false,
  className,
}: AudioRecorderProps) {
  const [recorderState, setRecorderState] = useState<RecorderState>("idle");
  const [error, setError] = useState<RecorderError | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [hasRecording, setHasRecording] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const previewUrlRef = useRef<string | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopStream();
      revokePreviewUrl();
      if (timerRef.current) clearInterval(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function stopStream() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }

  function revokePreviewUrl() {
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = null;
    }
  }

  const handleStartRecording = useCallback(async () => {
    setError(null);

    // Check browser support before requesting permission
    if (typeof window === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setError({ kind: "unsupported", message: DOMAIN_ERROR_MESSAGES.micUnsupported });
      setRecorderState("error");
      return;
    }
    if (typeof MediaRecorder === "undefined") {
      setError({ kind: "unsupported", message: DOMAIN_ERROR_MESSAGES.micUnsupported });
      setRecorderState("error");
      return;
    }

    setRecorderState("requesting");

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
    } catch (err) {
      const e = err as Error;
      if (e.name === "NotAllowedError" || e.name === "PermissionDeniedError") {
        setError({ kind: "permission-denied", message: DOMAIN_ERROR_MESSAGES.micPermissionDenied });
      } else {
        setError({ kind: "unknown", message: "Could not access the microphone. Please try again." });
      }
      setRecorderState("error");
      return;
    }

    streamRef.current = stream;
    chunksRef.current = [];

    const mimeType = getSupportedMimeType();
    const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
    mediaRecorderRef.current = recorder;

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };

    recorder.onstop = () => {
      stopStream();
      const finalMimeType = recorder.mimeType || mimeType || "audio/webm";
      const blob = new Blob(chunksRef.current, { type: finalMimeType });

      revokePreviewUrl();
      const url = URL.createObjectURL(blob);
      previewUrlRef.current = url;
      setPreviewUrl(url);
      setHasRecording(true);
      setRecorderState("reviewing");
      onRecordingReady(blob, finalMimeType);
    };

    recorder.start(250); // collect chunks every 250ms
    setElapsed(0);
    setRecorderState("recording");

    timerRef.current = setInterval(() => {
      setElapsed((prev) => prev + 1);
    }, 1000);
  }, [onRecordingReady]);

  const handleStopRecording = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    mediaRecorderRef.current?.stop();
    // onstop handler continues the flow
  }, []);

  const handleClear = useCallback(() => {
    revokePreviewUrl();
    setPreviewUrl(null);
    setHasRecording(false);
    setElapsed(0);
    setError(null);
    setRecorderState("idle");
    onRecordingCleared();
  }, [onRecordingCleared]);

  // ── Render: Error state ───────────────────────────────────────────────────
  if (recorderState === "error" && error) {
    return (
      <div className={cn("rounded-xl border border-bano-danger/30 bg-bano-danger-soft p-6 text-center space-y-3", className)}>
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-white/60 text-bano-danger">
          <MicOff className="h-6 w-6" aria-hidden />
        </div>
        <p className="text-sm font-medium text-foreground">
          {error.kind === "permission-denied" ? "Microphone access denied" : "Recording unavailable"}
        </p>
        <p className="text-xs text-bano-text-muted leading-relaxed max-w-[36ch] mx-auto">
          {error.message}
        </p>
        {error.kind === "permission-denied" && (
          <p className="text-xs text-bano-text-muted">
            To re-enable: open your browser&apos;s site settings, find &quot;Microphone&quot;, and set it to Allow. Then reload this page.
          </p>
        )}
        <Button variant="outline" size="sm" onClick={handleClear} className="mt-2">
          Try again
        </Button>
      </div>
    );
  }

  // ── Render: Reviewing ─────────────────────────────────────────────────────
  if (recorderState === "reviewing" && previewUrl) {
    return (
      <div className={cn("rounded-xl border border-border bg-bano-surface-sunken p-5 space-y-4", className)}>
        <div className="flex items-center gap-2 text-sm font-medium text-foreground">
          <CheckCircle2 className="h-4 w-4 text-bano-success" aria-hidden />
          Recording ready — {formatElapsed(elapsed)}
        </div>
        {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
        <audio controls src={previewUrl} className="w-full h-10" />
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleClear}
            disabled={disabled}
            className="gap-1.5"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Discard &amp; re-record
          </Button>
        </div>
      </div>
    );
  }

  // ── Render: Requesting permission ─────────────────────────────────────────
  if (recorderState === "requesting") {
    return (
      <div className={cn("flex flex-col items-center justify-center gap-3 rounded-xl border border-border bg-bano-surface-sunken p-10 text-center", className)}>
        <div className="rounded-full bg-bano-accent-soft p-3 animate-pulse">
          <Mic className="h-6 w-6 text-bano-accent" aria-hidden />
        </div>
        <p className="text-sm text-bano-text-muted">Requesting microphone permission…</p>
      </div>
    );
  }

  // ── Render: Recording ─────────────────────────────────────────────────────
  if (recorderState === "recording") {
    return (
      <div className={cn("flex flex-col items-center justify-center gap-4 rounded-xl border border-bano-danger/40 bg-bano-danger-soft/20 p-10 text-center", className)}>
        <div className="rounded-full bg-bano-danger-soft p-3 relative">
          <Mic className="h-6 w-6 text-bano-danger" aria-hidden />
          <span className="absolute top-0 right-0 h-2.5 w-2.5 rounded-full bg-bano-danger">
            <span className="absolute inset-0 rounded-full bg-bano-danger animate-ping opacity-75" />
          </span>
        </div>
        <div>
          <p className="text-2xl font-mono font-bold text-foreground tabular-nums" aria-live="polite" aria-label={`Recording time: ${formatElapsed(elapsed)}`}>
            {formatElapsed(elapsed)}
          </p>
          <p className="text-xs text-bano-text-muted mt-1">Recording in progress…</p>
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={handleStopRecording}
          disabled={disabled}
          className="gap-2 border-bano-danger/40 text-bano-danger hover:bg-bano-danger-soft"
        >
          <Square className="h-4 w-4" />
          Stop Recording
        </Button>
      </div>
    );
  }

  // ── Render: Idle ─────────────────────────────────────────────────────────
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-border p-10 text-center",
        disabled && "opacity-50 pointer-events-none",
        className
      )}
    >
      <div className="rounded-full bg-bano-surface-sunken p-3">
        <Mic className="h-6 w-6 text-bano-text-muted" aria-hidden />
      </div>
      <div>
        <p className="text-sm font-medium text-foreground">Record your lecture</p>
        <p className="text-xs text-bano-text-muted mt-0.5">
          Requires microphone permission
        </p>
      </div>
      <Button
        type="button"
        onClick={handleStartRecording}
        disabled={disabled}
        className="gap-2 mt-1"
      >
        <Play className="h-4 w-4" />
        Start Recording
      </Button>
    </div>
  );
}

// Also export hasRecording state so the parent can check without prop-drilling
export type { RecorderError };
