import React from "react";
import Link from "next/link";
import { AuthCard } from "@/components/layout/auth-card";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/config/routes";
import { Skeleton } from "@/components/ui/skeleton";

export default function LoginPage() {
  return (
    <AuthCard
      title="Welcome back"
      description="Sign in to your Bano.ai account to access your lectures."
      footer={
        <p>
          Don&apos;t have an account yet?{" "}
          <Link
            href={ROUTES.SIGNUP}
            className="font-medium text-bano-accent hover:underline"
          >
            Create account
          </Link>
        </p>
      }
    >
      <div className="space-y-4">
        <div className="rounded-md bg-bano-surface-sunken p-3 text-xs text-bano-text-muted text-center font-mono">
          [M1 Placeholder: Auth screens are fully wired in M2]
        </div>
        <div className="space-y-2">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-10 w-full" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-10 w-full" />
        </div>
        <Button asChild className="w-full h-10 mt-2">
          <Link href={ROUTES.DASHBOARD}>Enter Dashboard (Demo Mode)</Link>
        </Button>
      </div>
    </AuthCard>
  );
}
