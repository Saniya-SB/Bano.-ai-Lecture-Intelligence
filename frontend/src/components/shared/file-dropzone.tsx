"use client";

import React, { useCallback, useRef, useState } from "react";
import { Upload, FileAudio, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { ACCEPT_ATTRIBUTE, isAcceptedMimeType, CANDIDATE_EXTENSIONS } from "@/features/lecture-input/schemas/lecture-input.schema";
import { DOMAIN_ERROR_MESSAGES } from "@/lib/error-messages";

interface FileDropzoneProps {
  onFileSelected: (file: File) => void;
  onFileCleared: () => void;
  selectedFile: File | null;
  disabled?: boolean;
  className?: string;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function FileDropzone({
  onFileSelected,
  onFileCleared,
  selectedFile,
  disabled = false,
  className,
}: FileDropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const validateAndSelect = useCallback(
    (file: File) => {
      setValidationError(null);
      // Client-side MIME type check (advisory — backend enforces authoritatively)
      if (!isAcceptedMimeType(file.type)) {
        setValidationError(DOMAIN_ERROR_MESSAGES.unsupportedFormat);
        return;
      }
      onFileSelected(file);
    },
    [onFileSelected]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) setIsDragging(true);
  }, [disabled]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
      if (disabled) return;
      const file = e.dataTransfer.files[0];
      if (file) validateAndSelect(file);
    },
    [disabled, validateAndSelect]
  );

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) validateAndSelect(file);
      // Reset so the same file can be re-selected after clearing
      e.target.value = "";
    },
    [validateAndSelect]
  );

  const handleClear = useCallback(() => {
    setValidationError(null);
    onFileCleared();
  }, [onFileCleared]);

  if (selectedFile) {
    return (
      <div
        className={cn(
          "flex items-center justify-between gap-3 rounded-lg border border-bano-accent/40 bg-bano-accent-soft px-4 py-3",
          className
        )}
      >
        <div className="flex items-center gap-3 min-w-0">
          <FileAudio className="h-5 w-5 text-bano-accent shrink-0" aria-hidden />
          <div className="min-w-0">
            <p className="text-sm font-medium text-foreground truncate">{selectedFile.name}</p>
            <p className="text-xs text-bano-text-muted font-mono">{formatBytes(selectedFile.size)}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={handleClear}
          disabled={disabled}
          aria-label="Remove selected file"
          className="text-bano-text-muted hover:text-bano-accent transition-colors disabled:pointer-events-none"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    );
  }

  return (
    <div className={cn("space-y-2", className)}>
      {/* Dropzone area */}
      <div
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-label="File drop zone. Click or drag and drop an audio or video file."
        aria-disabled={disabled}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !disabled && inputRef.current?.click()}
        onKeyDown={(e) => {
          if (!disabled && (e.key === "Enter" || e.key === " ")) inputRef.current?.click();
        }}
        className={cn(
          "flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-10 text-center cursor-pointer transition-colors",
          "border-border hover:border-bano-accent/60 hover:bg-bano-accent-soft/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          isDragging && "border-bano-accent bg-bano-accent-soft/40",
          disabled && "pointer-events-none opacity-50 cursor-not-allowed",
          validationError && "border-bano-danger/50 bg-bano-danger-soft/20"
        )}
      >
        <div className="rounded-full bg-bano-surface-sunken p-3">
          <Upload className="h-6 w-6 text-bano-text-muted" aria-hidden />
        </div>
        <div>
          <p className="text-sm font-medium text-foreground">
            Drop your file here, or{" "}
            <span className="text-bano-accent underline underline-offset-2">browse</span>
          </p>
          <p className="mt-1 text-xs text-bano-text-muted font-mono uppercase tracking-wider">
            {CANDIDATE_EXTENSIONS.join(" · ")}
          </p>
        </div>
      </div>

      {/* Hidden native file input */}
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT_ATTRIBUTE}
        className="sr-only"
        tabIndex={-1}
        aria-hidden
        onChange={handleInputChange}
        disabled={disabled}
      />

      {/* Client-side validation error */}
      {validationError && (
        <p className="text-xs text-danger" role="alert">
          {validationError}
        </p>
      )}
    </div>
  );
}
