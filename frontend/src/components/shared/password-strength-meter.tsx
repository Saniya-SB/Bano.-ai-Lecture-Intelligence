"use client";

import React from "react";
import { cn } from "@/lib/utils";
import {
  scorePassword,
  STRENGTH_LABELS,
  STRENGTH_COLORS,
  type PasswordStrength,
} from "@/features/auth/schemas/auth.schema";

interface PasswordStrengthMeterProps {
  password: string;
  className?: string;
}

/**
 * Advisory-only 4-segment password strength indicator.
 * This component never blocks form submission — it is purely informational.
 */
export function PasswordStrengthMeter({
  password,
  className,
}: PasswordStrengthMeterProps) {
  const score: PasswordStrength = scorePassword(password);

  if (!password) return null;

  return (
    <div className={cn("space-y-1.5", className)} aria-live="polite">
      {/* 4-segment bar */}
      <div className="flex gap-1" role="img" aria-label={`Password strength: ${STRENGTH_LABELS[score]}`}>
        {([1, 2, 3, 4] as const).map((seg) => (
          <div
            key={seg}
            className={cn(
              "h-1 flex-1 rounded-full transition-colors duration-200",
              score >= seg ? STRENGTH_COLORS[score] : "bg-bano-surface-sunken border border-border"
            )}
          />
        ))}
      </div>
      {/* Strength label */}
      {score > 0 && (
        <p className="text-xs text-bano-text-muted">
          Strength:{" "}
          <span
            className={cn(
              "font-medium",
              score === 1 && "text-red-600",
              score === 2 && "text-amber-600",
              score === 3 && "text-yellow-600",
              score === 4 && "text-green-600"
            )}
          >
            {STRENGTH_LABELS[score]}
          </span>
        </p>
      )}
    </div>
  );
}
