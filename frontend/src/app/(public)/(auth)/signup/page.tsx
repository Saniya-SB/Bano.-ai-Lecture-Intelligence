"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { AuthCard } from "@/components/layout/auth-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { InlineAlert } from "@/components/shared/inline-alert";
import { PasswordInput } from "@/components/shared/password-input";
import { PasswordStrengthMeter } from "@/components/shared/password-strength-meter";
import { ROUTES } from "@/config/routes";
import { env } from "@/config/env";
import { authService } from "@/services/auth-service";
import { signupSchema, type SignupFormValues } from "@/features/auth/schemas/auth.schema";
import { getErrorMessage } from "@/lib/error-messages";

function GoogleIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
      />
    </svg>
  );
}

export default function SignupPage() {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: { acceptTerms: false },
  });

  const passwordValue = watch("password", "");
  const isDisabled = isSubmitting || isGoogleLoading;

  async function handleGoogleSignIn() {
    setServerError(null);
    setIsGoogleLoading(true);
    try {
      await authService.signInWithGoogle();
      toast.success("Google se account connect ho gaya");
      router.push(ROUTES.DASHBOARD);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Google sign in failed";
      setServerError(msg);
      toast.error(msg);
    } finally {
      setIsGoogleLoading(false);
    }
  }

  async function onSubmit(values: SignupFormValues) {
    setServerError(null);
    try {
      await authService.signup({
        full_name: values.fullName,
        email: values.email,
        password: values.password,
      });
      toast.success("Account created! Welcome to Bano.ai.");
      router.push(ROUTES.DASHBOARD);
    } catch (err) {
      setServerError(getErrorMessage(err));
    }
  }

  return (
    <AuthCard
      title="Create Account"
      description="Start turning your Hinglish lectures into clear study materials."
      footer={
        <p>
          Already have an account?{" "}
          <Link href={ROUTES.LOGIN} className="font-medium text-bano-accent hover:underline">
            Sign in
          </Link>
        </p>
      }
    >
      <div className="space-y-4">
        {serverError && <InlineAlert variant="danger">{serverError}</InlineAlert>}

        {/* Google Sign-In Button */}
        <Button
          type="button"
          variant="outline"
          className="w-full gap-2.5 h-10 border-border bg-card hover:bg-bano-surface-sunken font-medium text-sm"
          onClick={handleGoogleSignIn}
          disabled={isDisabled}
        >
          <GoogleIcon />
          <span>{isGoogleLoading ? "Connecting to Google…" : "Continue with Google"}</span>
        </Button>

        <div className="relative my-3 text-center">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-border" />
          </div>
          <span className="relative bg-card px-2 text-xs uppercase font-mono text-bano-text-subtle">
            {env.AUTH_MODE === "dev" ? "Ya Dev Mode Signup" : "Or with email"}
          </span>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="signup-name">Full name</Label>
            <Input
              id="signup-name"
              type="text"
              autoComplete="name"
              placeholder="e.g. Aman Khan"
              aria-invalid={!!errors.fullName}
              disabled={isDisabled}
              {...register("fullName")}
            />
            {errors.fullName && (
              <p className="text-xs text-danger" role="alert">{errors.fullName.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="signup-email">Email</Label>
            <Input
              id="signup-email"
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

          <div className="space-y-1.5">
            <Label htmlFor="signup-password">Password</Label>
            <PasswordInput
              id="signup-password"
              autoComplete="new-password"
              placeholder="At least 8 characters"
              aria-invalid={!!errors.password}
              disabled={isDisabled}
              {...register("password")}
            />
            <PasswordStrengthMeter password={passwordValue} />
            {errors.password && (
              <p className="text-xs text-danger" role="alert">{errors.password.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <div className="flex items-start gap-2.5 pt-1">
              <input
                id="signup-terms"
                type="checkbox"
                aria-invalid={!!errors.acceptTerms}
                disabled={isDisabled}
                className="mt-0.5 h-4 w-4 rounded border-border accent-bano-accent cursor-pointer"
                {...register("acceptTerms")}
              />
              <Label htmlFor="signup-terms" className="text-xs text-bano-text-muted font-normal cursor-pointer leading-relaxed">
                I agree to the{" "}
                <Link href={ROUTES.TERMS} className="text-bano-accent hover:underline">
                  Terms of Service
                </Link>{" "}
                and{" "}
                <Link href={ROUTES.PRIVACY} className="text-bano-accent hover:underline">
                  Privacy Policy
                </Link>
              </Label>
            </div>
            {errors.acceptTerms && (
              <p className="text-xs text-danger" role="alert">{errors.acceptTerms.message}</p>
            )}
          </div>

          <Button type="submit" className="w-full" disabled={isDisabled}>
            {isSubmitting ? "Creating account…" : "Create account"}
          </Button>
        </form>
      </div>
    </AuthCard>
  );
}
