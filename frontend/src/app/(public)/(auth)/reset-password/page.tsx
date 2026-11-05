import React from "react";
import Link from "next/link";
import { AuthCard } from "@/components/layout/auth-card";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/config/routes";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft } from "lucide-react";

export default function ResetPasswordPage() {
  return (
    <AuthCard
      title="Set new password"
      description="Enter a new password for your Bano.ai account."
      footer={
        <Link
          href={ROUTES.LOGIN}
          className="inline-flex items-center gap-1.5 font-medium text-bano-accent hover:underline"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to sign in
        </Link>
      }
    >
      <div className="space-y-4">
        <div className="rounded-md bg-bano-surface-sunken p-3 text-xs text-bano-text-muted text-center font-mono">
          [Proposed Feature: Under capability flag resetPasswordConfirm]
        </div>
        <div className="space-y-2">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-10 w-full" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-10 w-full" />
        </div>
        <Button asChild className="w-full h-10 mt-2">
          <Link href={ROUTES.LOGIN}>Save Password</Link>
        </Button>
      </div>
    </AuthCard>
  );
}
