import React from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { ROUTES } from "@/config/routes";
import { cn } from "@/lib/utils";

interface AuthCardProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
}

export function AuthCard({
  title,
  description,
  children,
  footer,
  className,
}: AuthCardProps) {
  return (
    <div className="flex min-h-[calc(100vh-144px)] flex-col items-center justify-center py-12 px-4 sm:px-6">
      {/* Brand Header */}
      <div className="mb-8 text-center">
        <Link href={ROUTES.HOME} className="inline-flex items-center gap-2">
          <span className="font-heading font-bold text-2xl tracking-tight text-foreground">
            bano<span className="text-bano-accent">.</span>ai
          </span>
          <span className="rounded-sm bg-bano-surface-sunken border border-border px-1.5 py-0.5 text-[10px] font-mono text-bano-text-subtle uppercase">
            Platform
          </span>
        </Link>
      </div>

      {/* Card Container */}
      <Card
        className={cn(
          "w-full max-w-[440px] p-8 bg-card border-border shadow-sm rounded-xl",
          className
        )}
      >
        <div className="mb-6 space-y-1.5 text-center sm:text-left">
          <h2 className="text-2xl font-heading font-bold tracking-tight text-foreground">
            {title}
          </h2>
          {description && (
            <p className="text-sm text-bano-text-muted">{description}</p>
          )}
        </div>

        {children}

        {footer && (
          <div className="mt-6 pt-6 border-t border-border text-center text-sm text-bano-text-muted">
            {footer}
          </div>
        )}
      </Card>
    </div>
  );
}
