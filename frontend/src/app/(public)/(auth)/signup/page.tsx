"use client";

import React from "react";
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
import { authService } from "@/services/auth-service";
import { signupSchema, type SignupFormValues } from "@/features/auth/schemas/auth.schema";
import { getErrorMessage } from "@/lib/error-messages";

export default function SignupPage() {
  const router = useRouter();
  const [serverError, setServerError] = React.useState<string | null>(null);

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
  const isDisabled = isSubmitting;

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
      title="Create your account"
      description="Start turning Hinglish lectures into notes and study material."
      footer={
        <p>
          Already have an account?{" "}
          <Link href={ROUTES.LOGIN} className="font-medium text-bano-accent hover:underline">
            Sign in
          </Link>
        </p>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
        {serverError && <InlineAlert variant="danger">{serverError}</InlineAlert>}

        {/* Full Name */}
        <div className="space-y-1.5">
          <Label htmlFor="signup-name">Full name</Label>
          <Input
            id="signup-name"
            type="text"
            autoComplete="name"
            placeholder="Aman Sharma"
            aria-invalid={!!errors.fullName}
            disabled={isDisabled}
            {...register("fullName")}
          />
          {errors.fullName && (
            <p className="text-xs text-danger" role="alert">{errors.fullName.message}</p>
          )}
        </div>

        {/* Email */}
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

        {/* Password + strength meter */}
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
          {errors.password && (
            <p className="text-xs text-danger" role="alert">{errors.password.message}</p>
          )}
          <PasswordStrengthMeter password={passwordValue} />
        </div>

        {/* Confirm Password */}
        <div className="space-y-1.5">
          <Label htmlFor="signup-confirm">Confirm password</Label>
          <PasswordInput
            id="signup-confirm"
            autoComplete="new-password"
            placeholder="Repeat your password"
            aria-invalid={!!errors.confirmPassword}
            disabled={isDisabled}
            {...register("confirmPassword")}
          />
          {errors.confirmPassword && (
            <p className="text-xs text-danger" role="alert">{errors.confirmPassword.message}</p>
          )}
        </div>

        {/* Terms checkbox */}
        <div className="flex items-start gap-2">
          <input
            id="signup-terms"
            type="checkbox"
            className="mt-0.5 h-4 w-4 rounded border-border accent-bano-accent"
            disabled={isDisabled}
            {...register("acceptTerms")}
          />
          <Label htmlFor="signup-terms" className="text-sm font-normal leading-snug cursor-pointer">
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
          <p className="text-xs text-danger -mt-2" role="alert">{errors.acceptTerms.message}</p>
        )}

        <Button type="submit" className="w-full" disabled={isDisabled}>
          {isSubmitting ? "Creating account…" : "Create account"}
        </Button>
      </form>
    </AuthCard>
  );
}
