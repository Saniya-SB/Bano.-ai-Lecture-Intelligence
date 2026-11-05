import React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/config/routes";
import { FileQuestion, ArrowLeft } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-bano-bg p-4 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-bano-accent-soft text-bano-accent mb-6">
        <FileQuestion className="h-8 w-8" />
      </div>
      <h1 className="text-3xl font-heading font-bold text-foreground mb-2">
        Page Not Found
      </h1>
      <p className="max-w-md text-bano-text-muted mb-8 text-sm">
        The page you are looking for does not exist or may have been moved.
      </p>
      <Button asChild>
        <Link href={ROUTES.HOME} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Back to Home
        </Link>
      </Button>
    </div>
  );
}
