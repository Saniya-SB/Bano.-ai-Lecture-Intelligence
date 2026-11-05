import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-sm border px-2.5 py-0.5 text-xs font-mono font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-bano-accent text-white shadow-none",
        secondary:
          "border-border bg-bano-surface-sunken text-bano-text",
        accent:
          "border-transparent bg-bano-accent-soft text-bano-accent",
        outline: "text-foreground border-border",
        success:
          "border-transparent bg-bano-success-soft text-bano-success",
        warning:
          "border-transparent bg-bano-warning-soft text-bano-warning",
        danger:
          "border-transparent bg-bano-danger-soft text-bano-danger",
        info:
          "border-transparent bg-bano-info-soft text-bano-info",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
