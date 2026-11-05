"use client";

import React, { useEffect } from "react";
import { ErrorState } from "@/components/shared/error-state";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ROUTES } from "@/config/routes";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log without exposing sensitive data
    console.error("Application error boundary triggered:", error?.message);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-bano-bg p-6">
      <div className="w-full max-w-md">
        <ErrorState
          title="Something went wrong"
          message="An unexpected error occurred while loading this page. Please try again or return home."
          onRetry={reset}
        />
        <div className="mt-4 text-center">
          <Button variant="ghost" asChild size="sm">
            <Link href={ROUTES.HOME}>Return to Home</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
