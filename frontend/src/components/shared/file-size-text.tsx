import React from "react";
import { cn } from "@/lib/utils";

interface FileSizeTextProps {
  bytes: number;
  className?: string;
}

export function formatFileSize(bytes: number): string {
  if (bytes <= 0 || isNaN(bytes)) return "0 B";

  const units = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const unitIndex = Math.min(i, units.length - 1);
  const size = bytes / Math.pow(1024, unitIndex);

  return `${size.toFixed(unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
}

export function FileSizeText({ bytes, className }: FileSizeTextProps) {
  return (
    <span className={cn("font-mono text-sm tabular-nums text-bano-text-muted", className)}>
      {formatFileSize(bytes)}
    </span>
  );
}
