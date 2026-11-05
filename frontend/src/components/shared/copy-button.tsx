"use client";

import React, { useState } from "react";
import { Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface CopyButtonProps {
  value: string;
  label?: string;
  successMessage?: string;
  className?: string;
  variant?: "ghost" | "secondary" | "outline";
  size?: "default" | "sm" | "icon";
}

export function CopyButton({
  value,
  label,
  successMessage = "Copied to clipboard",
  className,
  variant = "ghost",
  size = "sm",
}: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      toast.success(successMessage);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy to clipboard");
    }
  };

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleCopy}
      className={cn("text-xs font-medium", className)}
      aria-label={label || "Copy to clipboard"}
    >
      {copied ? (
        <Check className="h-3.5 w-3.5 text-bano-success mr-1.5" />
      ) : (
        <Copy className="h-3.5 w-3.5 mr-1.5" />
      )}
      {label || (copied ? "Copied" : "Copy")}
    </Button>
  );
}
