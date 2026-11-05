import React from "react";
import { AlertCircle, CheckCircle2, Info, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

type AlertVariant = "info" | "warning" | "danger" | "success";

interface InlineAlertProps {
  variant?: AlertVariant;
  title?: string;
  children: React.ReactNode;
  className?: string;
}

const variantConfig: Record<
  AlertVariant,
  { bg: string; text: string; icon: React.ElementType }
> = {
  info: {
    bg: "bg-bano-info-soft border-bano-info/30",
    text: "text-bano-info",
    icon: Info,
  },
  warning: {
    bg: "bg-bano-warning-soft border-bano-warning/30",
    text: "text-bano-warning",
    icon: AlertTriangle,
  },
  danger: {
    bg: "bg-bano-danger-soft border-bano-danger/30",
    text: "text-bano-danger",
    icon: AlertCircle,
  },
  success: {
    bg: "bg-bano-success-soft border-bano-success/30",
    text: "text-bano-success",
    icon: CheckCircle2,
  },
};

export function InlineAlert({
  variant = "info",
  title,
  children,
  className,
}: InlineAlertProps) {
  const config = variantConfig[variant];
  const Icon = config.icon;

  return (
    <div
      role="alert"
      className={cn(
        "flex items-start gap-3 rounded-md border p-3.5 text-sm",
        config.bg,
        className
      )}
    >
      <Icon className={cn("h-5 w-5 shrink-0 mt-0.5", config.text)} />
      <div className="flex-1 space-y-1">
        {title && <p className={cn("font-medium", config.text)}>{title}</p>}
        <div className="text-foreground/90">{children}</div>
      </div>
    </div>
  );
}
