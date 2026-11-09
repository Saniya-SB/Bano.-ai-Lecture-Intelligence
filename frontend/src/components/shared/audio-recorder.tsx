"use client";

/**
 * AudioRecorder — robust in-browser MediaRecorder component.
 *
 * Designed to be dynamically loaded with ssr: false.
 * Features:
 *  - Auto selects supported mime type (webm/opus or mp4 on Safari).
 *  - Clear permission request, denied, and unsupported states with plain instructions.
 *  - Microphone device selection when multiple input devices exist.
 *  - Live timer, audio input level meter, and pause / resume / stop controls.
 *  - Preview playback with re-record and discard actions.
 *  - Configurable max duration enforcement with auto-stop.
 *  - Warns on beforeunload if recording is active.
 *  - Mobile responsive touch targets.
 */

import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Mic,
  Square,
  Play,
  Pause,
  Trash2,
  CheckCircle2,
  MicOff,
  RotateCcw,
  Settings2,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { DOMAIN_ERROR_MESSAGES } from "@/lib/error-messages";

export type RecorderState =
  | "idle"
  | "requesting"
  | "recording"
  | "paused"
  | "reviewing"
  | "error";

export interface RecorderError {
  kind: "permission-denied" | "unsupported" | "unknown";
  message: string;
}

export interface AudioRecorderProps {
  onRecordingReady: (blob: Blob, mimeType: string) => void;
  onRecordingCleared: () => void;
  maxDurationSeconds?: number;
  disabled?: boolean;
  className?: string;
}

/** Automatically choose the best supported MIME type */
function getSupportedMimeType(): string {
  if (typeof MediaRecorder === "undefined") return "";
  const candidates = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/mp4",
    "audio/aac",
    "audio/ogg;codecs=opus",
  ];
  for (const type of candidates) {
    if (MediaRecorder.isTypeSupported(type)) {
      return type;
    }
  }
  return "";
}

function formatElapsed(seconds: number): string {
  const m = Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0");
  const s = (seconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

export function AudioRecorder({
  onRecordingReady,
  onRecordingCleared,
  maxDurationSeconds = 7200, // 2 hours default
  disabled = false,
  className,
}: AudioRecorderProps) {
  const [recorderState, setRecorderState] = useState<RecorderState>("idle");
  const [error, setError] = useState<RecorderError | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>("");
  const [inputLevel, setInputLevel] = useState<number>(0);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const previewUrlRef = useRef<string | null>(null);

  // Web Audio API refs for level meter
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number | null>(null);

  // Load available microphone devices
  const refreshDevices = useCallback(async () => {
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.enumerateDevices) {
      return;
    }
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const audioInputs = devices.filter((d) => d.kind === "audioinput");
      setAudioDevices(audioInputs);
      if (audioInputs.length > 0 && !selectedDeviceId && audioInputs[0]) {
        setSelectedDeviceId(audioInputs[0].deviceId);
      }
    } catch {
      // Ignore device enumeration errors
    }
  }, [selectedDeviceId]);

  useEffect(() => {
    refreshDevices();
  }, [refreshDevices]);

  // Warn before leaving page during active recording
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (recorderState === "recording" || recorderState === "paused") {
        e.preventDefault();
        e.returnValue = "You have a recording in progress. Are you sure you want to leave?";
        return e.returnValue;
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [recorderState]);

  // Teardown helper
  const stopStream = useCallback(() => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== "closed") {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    analyserRef.current = null;
    setInputLevel(0);

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  }, []);

  const revokePreviewUrl = useCallback(() => {
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      stopStream();
      revokePreviewUrl();
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [stopStream, revokePreviewUrl]);

  // Setup live audio meter via AnalyserNode
  const setupAudioMeter = (stream: MediaStream) => {
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;

      const audioCtx = new AudioCtx();
      audioContextRef.current = audioCtx;
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 64;
      analyser.smoothingTimeConstant = 0.5;
      source.connect(analyser);
      analyserRef.current = analyser;

      const dataArray = new Uint8Array(analyser.frequencyBinCount);

      const updateMeter = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteFrequencyData(dataArray);

        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i] ?? 0;
        }
        const average = sum / dataArray.length;
        const normalized = Math.min(100, Math.round((average / 128) * 100));
        setInputLevel(normalized);

        animFrameRef.current = requestAnimationFrame(updateMeter);
      };

      updateMeter();
    } catch {
      // AudioContext meter failure is non-fatal
    }
  };

  const handleStartRecording = useCallback(async () => {
    setError(null);

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
      const audioConstraints: MediaTrackConstraints = {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      };
      if (selectedDeviceId) {
        audioConstraints.deviceId = { exact: selectedDeviceId };
      }

      stream = await navigator.mediaDevices.getUserMedia({
        audio: audioConstraints,
        video: false,
      });

      // Update available devices now that permission is granted
      refreshDevices();
    } catch (err) {
      const e = err as Error;
      if (e.name === "NotAllowedError" || e.name === "PermissionDeniedError") {
        setError({ kind: "permission-denied", message: DOMAIN_ERROR_MESSAGES.micPermissionDenied });
      } else {
        setError({
          kind: "unknown",
          message: "Microphone ko access nahi kar paye. Kripya permission check karein aur refresh karein.",
        });
      }
      setRecorderState("error");
      return;
    }

    streamRef.current = stream;
    chunksRef.current = [];

    const mimeType = getSupportedMimeType();
    let recorder: MediaRecorder;
    try {
      recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
    } catch {
      // Fallback without mimeType option
      recorder = new MediaRecorder(stream);
    }
    mediaRecorderRef.current = recorder;

    recorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) {
        chunksRef.current.push(e.data);
      }
    };

    recorder.onstop = () => {
      stopStream();
      const finalMimeType = recorder.mimeType || mimeType || "audio/webm";
      const blob = new Blob(chunksRef.current, { type: finalMimeType });

      revokePreviewUrl();
      const url = URL.createObjectURL(blob);
      previewUrlRef.current = url;
      setPreviewUrl(url);
      setRecorderState("reviewing");
      onRecordingReady(blob, finalMimeType);
    };

    // Start metering and recording
    setupAudioMeter(stream);
    recorder.start(250); // collect chunk every 250ms
    setElapsed(0);
    setRecorderState("recording");

    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setElapsed((prev) => {
        const next = prev + 1;
        if (next >= maxDurationSeconds) {
          // Reached maximum allowed duration: auto stop
          if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
            mediaRecorderRef.current.stop();
          }
          if (timerRef.current) clearInterval(timerRef.current);
        }
        return next;
      });
    }, 1000);
  }, [selectedDeviceId, refreshDevices, maxDurationSeconds, onRecordingReady, stopStream, revokePreviewUrl]);

  const handlePauseResume = useCallback(() => {
    if (!mediaRecorderRef.current) return;

    if (recorderState === "recording") {
      mediaRecorderRef.current.pause();
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      setRecorderState("paused");
    } else if (recorderState === "paused") {
      mediaRecorderRef.current.resume();
      setRecorderState("recording");
      timerRef.current = setInterval(() => {
        setElapsed((prev) => prev + 1);
      }, 1000);
    }
  }, [recorderState]);

  const handleStopRecording = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
  }, []);

  const handleClear = useCallback(() => {
    stopStream();
    revokePreviewUrl();
    setPreviewUrl(null);
    setElapsed(0);
    setError(null);
    setRecorderState("idle");
    onRecordingCleared();
  }, [stopStream, revokePreviewUrl, onRecordingCleared]);

  // -------------------------------------------------------------------------
  // Render: Error State
  // -------------------------------------------------------------------------
  if (recorderState === "error" && error) {
    return (
      <div
        className={cn(
          "rounded-xl border border-bano-danger/30 bg-bano-danger-soft p-6 text-center space-y-4",
          className
        )}
      >
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-card text-bano-danger border border-bano-danger/20">
          <MicOff className="h-6 w-6" aria-hidden />
        </div>
        <div className="space-y-1">
          <p className="text-sm font-semibold font-heading text-foreground">
            {error.kind === "permission-denied"
              ? "Microphone access blocked"
              : "Recording unavailable"}
          </p>
          <p className="text-xs text-bano-text-muted leading-relaxed max-w-[42ch] mx-auto">
            {error.message}
          </p>
        </div>

        {error.kind === "permission-denied" && (
          <div className="text-left bg-card rounded-md p-3.5 border border-border text-xs text-bano-text-muted space-y-1.5 max-w-md mx-auto">
            <p className="font-semibold text-foreground">Permission allow karne ka tarika:</p>
            <ol className="list-decimal list-inside space-y-1 text-[11px] text-bano-text">
              <li>Browser URL bar mein padlock / settings icon click karein.</li>
              <li><strong>Microphone</strong> ko <strong>Allow</strong> karein.</li>
              <li>Page ko refresh karein ya neeche button dabayein.</li>
            </ol>
          </div>
        )}

        <Button variant="outline" size="sm" onClick={handleClear} className="mt-2 text-xs">
          Try again
        </Button>
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // Render: Reviewing / Preview playback state
  // -------------------------------------------------------------------------
  if (recorderState === "reviewing" && previewUrl) {
    return (
      <div
        className={cn(
          "rounded-xl border border-border bg-bano-surface-sunken p-5 space-y-4",
          className
        )}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-medium text-foreground">
            <CheckCircle2 className="h-4 w-4 text-bano-success" aria-hidden />
            Recording ready — {formatElapsed(elapsed)}
          </div>
          <span className="text-[11px] font-mono text-bano-text-subtle">
            Preview before submit
          </span>
        </div>

        {/* HTML5 Audio Player */}
        {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
        <audio controls src={previewUrl} className="w-full h-10 rounded focus:outline-none" />

        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-border/60">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleClear}
            disabled={disabled}
            className="gap-1.5 text-xs text-bano-danger hover:bg-bano-danger-soft border-border"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Discard &amp; re-record
          </Button>

          <p className="text-[11px] text-bano-text-muted">
            Satisfied? Niche lecture details daal kar &ldquo;Process lecture&rdquo; dabayein.
          </p>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // Render: Requesting permission
  // -------------------------------------------------------------------------
  if (recorderState === "requesting") {
    return (
      <div
        className={cn(
          "flex flex-col items-center justify-center gap-3 rounded-xl border border-border bg-bano-surface-sunken p-10 text-center",
          className
        )}
      >
        <div className="rounded-full bg-bano-accent-soft p-3 animate-pulse">
          <Mic className="h-6 w-6 text-bano-accent" aria-hidden />
        </div>
        <p className="text-sm text-foreground font-medium">Microphone permission maang rahe hain…</p>
        <p className="text-xs text-bano-text-muted">Browser prompt par &ldquo;Allow&rdquo; par click karein.</p>
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // Render: Active Recording / Paused state
  // -------------------------------------------------------------------------
  if (recorderState === "recording" || recorderState === "paused") {
    return (
      <div
        className={cn(
          "flex flex-col items-center justify-center gap-4 rounded-xl border p-8 text-center transition-all",
          recorderState === "recording"
            ? "border-bano-danger/40 bg-bano-danger-soft/10"
            : "border-bano-warning/40 bg-bano-warning-soft/10",
          className
        )}
      >
        <div className="relative">
          <div
            className={cn(
              "rounded-full p-4",
              recorderState === "recording" ? "bg-bano-danger-soft text-bano-danger" : "bg-bano-warning-soft text-bano-warning"
            )}
          >
            <Mic className="h-7 w-7" aria-hidden />
          </div>
          {recorderState === "recording" && (
            <span className="absolute top-1 right-1 h-3 w-3 rounded-full bg-bano-danger">
              <span className="absolute inset-0 rounded-full bg-bano-danger animate-ping opacity-75" />
            </span>
          )}
        </div>

        <div className="space-y-1">
          <p
            className="text-3xl font-mono font-bold text-foreground tabular-nums tracking-wider"
            aria-live="polite"
            aria-label={`Recording time: ${formatElapsed(elapsed)}`}
          >
            {formatElapsed(elapsed)}
          </p>
          <p className="text-xs text-bano-text-muted">
            {recorderState === "recording" ? "Live recording chal rahi hai…" : "Recording paused"}
          </p>
        </div>

        {/* Live Input Level Meter */}
        <div className="w-full max-w-xs space-y-1">
          <div className="flex justify-between text-[10px] text-bano-text-subtle">
            <span>Mic level</span>
            <span className="font-mono">{inputLevel}%</span>
          </div>
          <div className="h-1.5 w-full bg-bano-surface-sunken rounded-full overflow-hidden border border-border/40">
            <div
              className={cn(
                "h-full rounded-full transition-all duration-75",
                inputLevel > 75 ? "bg-bano-danger" : inputLevel > 25 ? "bg-bano-success" : "bg-bano-accent"
              )}
              style={{ width: `${inputLevel}%` }}
              role="meter"
              aria-valuenow={inputLevel}
              aria-valuemin={0}
              aria-valuemax={100}
            />
          </div>
        </div>

        {/* Recording Controls: Pause/Resume + Stop */}
        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handlePauseResume}
            disabled={disabled}
            className="gap-2 border-border text-foreground hover:bg-bano-surface-sunken"
          >
            {recorderState === "recording" ? (
              <>
                <Pause className="h-4 w-4" />
                Pause
              </>
            ) : (
              <>
                <Play className="h-4 w-4" />
                Resume
              </>
            )}
          </Button>

          <Button
            type="button"
            size="sm"
            onClick={handleStopRecording}
            disabled={disabled}
            className="gap-2 bg-bano-danger text-white hover:bg-bano-danger/90"
          >
            <Square className="h-4 w-4 fill-current" />
            Stop &amp; Review
          </Button>
        </div>

        <p className="text-[11px] text-bano-text-subtle">
          Recording stop karne par aap clip ko sun kar verify kar payenge.
        </p>
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // Render: Idle state (with device selector if multiple inputs)
  // -------------------------------------------------------------------------
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-4 rounded-xl border-2 border-dashed border-border p-8 text-center bg-card",
        disabled && "opacity-50 pointer-events-none",
        className
      )}
    >
      <div className="rounded-full bg-bano-surface-sunken p-3.5 text-bano-text-muted">
        <Mic className="h-6 w-6" aria-hidden />
      </div>

      <div className="space-y-1">
        <p className="text-sm font-semibold font-heading text-foreground">
          Lecture live record karein
        </p>
        <p className="text-xs text-bano-text-muted max-w-sm mx-auto">
          Apne device ke microphone se seedha Hinglish lecture record karein. Preview dekh kar upload hoga.
        </p>
      </div>

      {/* Mic device selection dropdown if multiple microphones are detected */}
      {audioDevices.length > 1 && (
        <div className="flex items-center gap-2 text-xs text-bano-text-muted max-w-xs w-full">
          <Settings2 className="h-3.5 w-3.5 shrink-0" />
          <select
            value={selectedDeviceId}
            onChange={(e) => setSelectedDeviceId(e.target.value)}
            className="w-full bg-bano-surface-sunken border border-border rounded-md px-2 py-1 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            aria-label="Microphone device"
          >
            {audioDevices.map((device, i) => (
              <option key={device.deviceId || i} value={device.deviceId}>
                {device.label || `Microphone ${i + 1}`}
              </option>
            ))}
          </select>
        </div>
      )}

      <Button
        type="button"
        onClick={handleStartRecording}
        disabled={disabled}
        className="gap-2 bg-bano-accent text-white hover:bg-bano-accent-hover font-medium px-5"
      >
        <Play className="h-4 w-4 fill-current" />
        Start Recording
      </Button>

      <p className="text-[11px] text-bano-text-subtle">
        WebM / Opus ya MP4 automatically select hoga.
      </p>
    </div>
  );
}
