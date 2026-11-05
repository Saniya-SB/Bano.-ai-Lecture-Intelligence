"use client";

import React, { Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { AuthCard } from "@/components/layout/auth-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { InlineAlert } from "@/components/shared/inline-alert";
import { PasswordInput } from "@/components/shared/password-input";
import { ROUTES } from "@/config/routes";
import { authService } from "@/services/auth-service";
import { loginSchema, type LoginFormValues } from "@/features/auth/schemas/auth.schema";
import { INVALID_CREDENTIALS_MESSAGE } from "@/lib/error-messages";

/** Validate that a ?next= redirect is a safe same-origin relative path. */
function getSafeNextPath(next: string | null): string {
  if (!next) return ROUTES.DASHBOARD;
  // Must start with "/" but NOT "//" (open redirect via protocol-relative URL)
  if (next.startsWith("/") && !next.startsWith("//")) return next;
  return ROUTES.DASHBOARD;
}

// Inner component — isolated so Suspense can wrap useSearchParams
function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [serverError, setServerError] = React.useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
  });

  async function onSubmit(values: LoginFormValues) {
    setServerError(null);
    try {
      await authService.login({ email: values.email, password: values.password });
      toast.success("Signed in successfully");
      const next = getSafeNextPath(searchParams.get("next"));
      router.push(next);
    } catch {
      // Always show a generic error — never reveal which field was wrong (§5.3)
      setServerError(INVALID_CREDENTIALS_MESSAGE);
    }
  }

  const isDisabled = isSubmitting;

  return (
    <AuthCard
      title="Welcome back"
      description="Sign in to your Bano.ai account to access your lectures."
      footer={
        <p>
          Don&apos;t have an account yet?{" "}
          <Link href={ROUTES.SIGNUP} className="font-medium text-bano-accent hover:underline">
            Create account
          </Link>
        </p>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
        {serverError && <InlineAlert variant="danger">{serverError}</InlineAlert>}

        {/* Email */}
        <div className="space-y-1.5">
          <Label htmlFor="login-email">Email</Label>
          <Input
            id="login-email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            aria-invalid={!!errors.email}
            disabled={isDisabled}
            {...register("email")}
          />
          {errors.email && (
            <p className="text-xs text-danger" role="alert">{errors.email.message}</p>
          )}
        </div>

        {/* Password */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="login-password">Password</Label>
            <Link
              href={ROUTES.FORGOT_PASSWORD}
              className="text-xs text-bano-text-muted hover:text-bano-accent hover:underline"
            >
              Forgot password?
            </Link>
          </div>
          <PasswordInput
            id="login-password"
            autoComplete="current-password"
            placeholder="Enter your password"
            aria-invalid={!!errors.password}
            disabled={isDisabled}
            {...register("password")}
          />
          {errors.password && (
            <p className="text-xs text-danger" role="alert">{errors.password.message}</p>
          )}
        </div>

        <Button type="submit" className="w-full" disabled={isDisabled}>
          {isSubmitting ? "Signing in…" : "Sign in"}
        </Button>
      </form>
    </AuthCard>
  );
}

// Page export — wraps the form in Suspense (required for useSearchParams in Next.js 15)
export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
