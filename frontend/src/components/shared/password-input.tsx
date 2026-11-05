"use client";

import React, { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface PasswordInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  /** Additional class applied to the outer wrapper div */
  wrapperClassName?: string;
}

/**
 * Input field with a show/hide password toggle button.
 * Always renders as a controlled or uncontrolled <input> — callers use it
 * exactly like a regular <Input> and pass ref via React.forwardRef.
 */
const PasswordInput = React.forwardRef<HTMLInputElement, PasswordInputProps>(
  ({ className, wrapperClassName, disabled, ...props }, ref) => {
    const [visible, setVisible] = useState(false);

    return (
      <div className={cn("relative", wrapperClassName)}>
        <Input
          {...props}
          ref={ref}
          type={visible ? "text" : "password"}
          disabled={disabled}
          className={cn("pr-10", className)}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          disabled={disabled}
          aria-label={visible ? "Hide password" : "Show password"}
          className={cn(
            "absolute inset-y-0 right-0 flex items-center px-3 text-bano-text-muted",
            "hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            "rounded-r-md transition-colors",
            disabled && "pointer-events-none opacity-50"
          )}
        >
          {visible ? (
            <EyeOff className="h-4 w-4" aria-hidden />
          ) : (
            <Eye className="h-4 w-4" aria-hidden />
          )}
        </button>
      </div>
    );
  }
);
PasswordInput.displayName = "PasswordInput";

export { PasswordInput };
