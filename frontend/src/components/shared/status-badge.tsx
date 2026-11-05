import React from "react";
import { LectureStatus } from "@/types/domain/common";
import { cn } from "@/lib/utils";
import { CheckCircle2, AlertCircle, Clock, Loader2 } from "lucide-react";

interface StatusBadgeProps {
  status: LectureStatus;
  className?: string;
}

interface StatusConfig {
  label: string;
  bgClass: string;
  textClass: string;
  icon: React.ReactNode;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const getStatusConfig = (s: LectureStatus): StatusConfig => {
    switch (s) {
      case "uploaded":
        return {
          label: "UPLOADED",
          bgClass: "bg-bano-surface-sunken border-border",
          textClass: "text-bano-text",
          icon: <Clock className="h-3 w-3 mr-1" aria-hidden="true" />,
        };
      case "processing":
        return {
          label: "PROCESSING",
          bgClass: "bg-bano-info-soft border-bano-info/30",
          textClass: "text-bano-info",
          icon: (
            <span className="relative flex h-2 w-2 mr-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-bano-info opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-bano-info"></span>
            </span>
          ),
        };
      case "transcribing":
        return {
          label: "TRANSCRIBING",
          bgClass: "bg-bano-info-soft border-bano-info/30",
          textClass: "text-bano-info",
          icon: (
            <Loader2 className="h-3 w-3 mr-1 animate-spin" aria-hidden="true" />
          ),
        };
      case "generating_notes":
        return {
          label: "GENERATING NOTES",
          bgClass: "bg-bano-info-soft border-bano-info/30",
          textClass: "text-bano-info",
          icon: (
            <span className="relative flex h-2 w-2 mr-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-bano-info opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-bano-info"></span>
            </span>
          ),
        };
      case "completed":
        return {
          label: "COMPLETED",
          bgClass: "bg-bano-success-soft border-bano-success/30",
          textClass: "text-bano-success",
          icon: <CheckCircle2 className="h-3 w-3 mr-1" aria-hidden="true" />,
        };
      case "failed":
        return {
          label: "FAILED",
          bgClass: "bg-bano-danger-soft border-bano-danger/30",
          textClass: "text-bano-danger",
          icon: <AlertCircle className="h-3 w-3 mr-1" aria-hidden="true" />,
        };
      default:
        return {
          label: "UNKNOWN",
          bgClass: "bg-bano-surface-sunken border-border",
          textClass: "text-bano-text-subtle",
          icon: <Clock className="h-3 w-3 mr-1" aria-hidden="true" />,
        };
    }
  };

  const config = getStatusConfig(status);

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-sm border px-2.5 py-0.5 text-xs font-mono font-medium tracking-wide",
        config.bgClass,
        config.textClass,
        className
      )}
    >
      {config.icon}
      {config.label}
    </span>
  );
}
