import React from "react";
import { cn } from "@/lib/utils";

interface DurationTextProps {
  seconds: number;
  className?: string;
  format?: "short" | "long" | "timer";
}

export function formatDuration(seconds: number, format: "short" | "long" | "timer" = "short"): string {
  if (isNaN(seconds) || seconds < 0) return "0s";

  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (format === "timer") {
    const pad = (n: number) => n.toString().padStart(2, "0");
    if (hrs > 0) {
      return `${pad(hrs)}:${pad(mins)}:${pad(secs)}`;
    }
    return `${pad(mins)}:${pad(secs)}`;
  }

  if (format === "long") {
    const parts: string[] = [];
    if (hrs > 0) parts.push(`${hrs} hr${hrs > 1 ? "s" : ""}`);
    if (mins > 0) parts.push(`${mins} min${mins > 1 ? "s" : ""}`);
    if (secs > 0 || parts.length === 0) parts.push(`${secs} sec${secs > 1 ? "s" : ""}`);
    return parts.join(" ");
  }

  // Short format: "47m 20s" or "1h 12m"
  if (hrs > 0) {
    return `${hrs}h ${mins}m`;
  }
  return `${mins}m ${secs}s`;
}

export function DurationText({
  seconds,
  className,
  format = "short",
}: DurationTextProps) {
  return (
    <span className={cn("font-mono text-sm tabular-nums text-bano-text", className)}>
      {formatDuration(seconds, format)}
    </span>
  );
}
