"use client";

import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { ArrowLeft, Lock } from "lucide-react";
import { AuthCard } from "@/components/layout/auth-card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { InlineAlert } from "@/components/shared/inline-alert";
import { PasswordInput } from "@/components/shared/password-input";
import { PasswordStrengthMeter } from "@/components/shared/password-strength-meter";
import { FEATURES } from "@/config/features";
import { ROUTES } from "@/config/routes";
import {
  resetPasswordSchema,
  type ResetPasswordFormValues,
} from "@/features/auth/schemas/auth.schema";
import { getErrorMessage } from "@/lib/error-messages";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [serverError, setServerError] = React.useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
  });

  const passwordValue = watch("password", "");

  // Guard: feature flag — not yet confirmed by backend
  if (!FEATURES.resetPasswordConfirm) {
    return (
      <AuthCard
        title="Not available yet"
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
        <div className="flex flex-col items-center gap-4 py-4 text-center">
          <div className="rounded-full bg-bano-surface-sunken p-4">
            <Lock className="h-8 w-8 text-bano-text-muted" aria-hidden />
          </div>
          <p className="text-sm text-bano-text-muted leading-relaxed">
            Password reset confirmation is not yet available. Please contact support or{" "}
            <Link href={ROUTES.FORGOT_PASSWORD} className="text-bano-accent hover:underline">
              request a new reset link
            </Link>
            .
          </p>
        </div>
      </AuthCard>
    );
  }

  async function onSubmit(_values: ResetPasswordFormValues) {
    setServerError(null);
    try {
      // Mock-only: simulate success (no real token handling until backend confirms contract)
      await new Promise((resolve) => setTimeout(resolve, 600));
      toast.success("Password updated. Please sign in with your new password.");
      router.push(ROUTES.LOGIN);
    } catch (err) {
      setServerError(getErrorMessage(err));
    }
  }

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
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
        {serverError && <InlineAlert variant="danger">{serverError}</InlineAlert>}

        <div className="space-y-1.5">
          <Label htmlFor="reset-password">New password</Label>
          <PasswordInput
            id="reset-password"
            autoComplete="new-password"
            placeholder="At least 8 characters"
            aria-invalid={!!errors.password}
            disabled={isSubmitting}
            {...register("password")}
          />
          {errors.password && (
            <p className="text-xs text-danger" role="alert">{errors.password.message}</p>
          )}
          <PasswordStrengthMeter password={passwordValue} />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="reset-confirm">Confirm new password</Label>
          <PasswordInput
            id="reset-confirm"
            autoComplete="new-password"
            placeholder="Repeat your new password"
            aria-invalid={!!errors.confirmPassword}
            disabled={isSubmitting}
            {...register("confirmPassword")}
          />
          {errors.confirmPassword && (
            <p className="text-xs text-danger" role="alert">{errors.confirmPassword.message}</p>
          )}
        </div>

        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? "Saving…" : "Save new password"}
        </Button>
      </form>
    </AuthCard>
  );
}
