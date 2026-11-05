"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, MailCheck } from "lucide-react";
import { AuthCard } from "@/components/layout/auth-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { InlineAlert } from "@/components/shared/inline-alert";
import { ROUTES } from "@/config/routes";
import { authService } from "@/services/auth-service";
import {
  forgotPasswordSchema,
  type ForgotPasswordFormValues,
} from "@/features/auth/schemas/auth.schema";
import { getErrorMessage } from "@/lib/error-messages";

export default function ForgotPasswordPage() {
  const [submitted, setSubmitted] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
  });

  async function onSubmit(values: ForgotPasswordFormValues) {
    setServerError(null);
    try {
      await authService.forgotPassword(values.email);
      setSubmitted(true);
    } catch (err) {
      setServerError(getErrorMessage(err));
    }
  }

  const backLink = (
    <Link
      href={ROUTES.LOGIN}
      className="inline-flex items-center gap-1.5 font-medium text-bano-accent hover:underline"
    >
      <ArrowLeft className="h-3.5 w-3.5" />
      Back to sign in
    </Link>
  );

  if (submitted) {
    return (
      <AuthCard title="Check your email" footer={backLink}>
        <div className="flex flex-col items-center gap-4 py-4 text-center">
          <div className="rounded-full bg-bano-surface-sunken p-4">
            <MailCheck className="h-8 w-8 text-bano-accent" aria-hidden />
          </div>
          <p className="text-sm text-bano-text-muted leading-relaxed max-w-[34ch]">
            If an account exists for that email address, we&apos;ve sent a password reset link.
            Check your spam folder if you don&apos;t see it.
          </p>
        </div>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      title="Reset your password"
      description="Enter your email address and we'll send you a password reset link."
      footer={backLink}
    >
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
        {serverError && <InlineAlert variant="danger">{serverError}</InlineAlert>}

        <div className="space-y-1.5">
          <Label htmlFor="forgot-email">Email</Label>
          <Input
            id="forgot-email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            aria-invalid={!!errors.email}
            disabled={isSubmitting}
            {...register("email")}
          />
          {errors.email && (
            <p className="text-xs text-danger" role="alert">{errors.email.message}</p>
          )}
        </div>

        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? "Sending…" : "Send reset link"}
        </Button>
      </form>
    </AuthCard>
  );
}
