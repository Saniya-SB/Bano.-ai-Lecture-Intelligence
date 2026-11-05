"use client";

import React, { useState } from "react";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  actionLabel: string;
  onConfirm: () => void;
  variant?: "destructive" | "default";
  requiredKeyword?: string; // Optional keyword required to type (e.g. "DELETE")
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  actionLabel,
  onConfirm,
  variant = "destructive",
  requiredKeyword,
}: ConfirmDialogProps) {
  const [typedInput, setTypedInput] = useState("");
  const isKeywordMatched = !requiredKeyword || typedInput === requiredKeyword;

  const handleConfirm = () => {
    if (isKeywordMatched) {
      onConfirm();
      onOpenChange(false);
      setTypedInput("");
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>

        {requiredKeyword && (
          <div className="py-2 space-y-2">
            <p className="text-xs text-bano-text-subtle font-mono">
              Please type <span className="font-bold text-foreground">{requiredKeyword}</span> to confirm:
            </p>
            <Input
              value={typedInput}
              onChange={(e) => setTypedInput(e.target.value)}
              placeholder={requiredKeyword}
              className="font-mono text-sm"
              autoFocus
            />
          </div>
        )}

        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => setTypedInput("")}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={!isKeywordMatched}
            className={variant === "destructive" ? "bg-destructive text-white hover:bg-destructive/90" : ""}
          >
            {actionLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
