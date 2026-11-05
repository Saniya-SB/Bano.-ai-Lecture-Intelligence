/**
 * Auth form smoke tests
 * Verifies that key fields render and basic validation messages are accessible.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import React from "react";

// ---------------------------------------------------------------------------
// Mocks — must come before importing components that use them
// ---------------------------------------------------------------------------

// next/navigation
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
  useSearchParams: () => ({ get: () => null }),
}));

// auth service — avoids real network calls
vi.mock("@/services/auth-service", () => ({
  authService: {
    login: vi.fn().mockRejectedValue(new Error("Invalid credentials")),
    signup: vi.fn().mockResolvedValue({ id: "1", email: "a@b.com", fullName: "Aman" }),
    forgotPassword: vi.fn().mockResolvedValue(undefined),
  },
}));

// sonner toast
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

// ---------------------------------------------------------------------------
// Import pages AFTER mocks are set up
// ---------------------------------------------------------------------------
// We import lazily inside each describe block to avoid hoisting issues.

describe("Login page", () => {
  it("renders email and password fields", async () => {
    const { default: LoginPage } = await import(
      "@/app/(public)/(auth)/login/page"
    );
    render(<LoginPage />);
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    // Use the input id directly to avoid matching the toggle button's aria-label
    expect(document.getElementById("login-password")).toBeInTheDocument();
  });

  it("shows forgot-password link", async () => {
    const { default: LoginPage } = await import(
      "@/app/(public)/(auth)/login/page"
    );
    render(<LoginPage />);
    expect(screen.getByText(/forgot password/i)).toBeInTheDocument();
  });

  it("shows generic error message on failed login (never reveals which field)", async () => {
    const { default: LoginPage } = await import(
      "@/app/(public)/(auth)/login/page"
    );
    render(<LoginPage />);
    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: "test@example.com" },
    });
    // Use id selector to avoid ambiguity with the toggle button's aria-label
    const passwordInput = document.getElementById("login-password") as HTMLInputElement;
    fireEvent.change(passwordInput, {
      target: { value: "Password1!" },
    });
    fireEvent.click(screen.getByRole("button", { name: /sign in/i }));
    await waitFor(() => {
      expect(screen.getByText(/invalid email or password/i)).toBeInTheDocument();
    });
  });
});

describe("Sign-up page", () => {
  it("renders all required fields", async () => {
    const { default: SignupPage } = await import(
      "@/app/(public)/(auth)/signup/page"
    );
    render(<SignupPage />);
    expect(screen.getByLabelText(/full name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    // Password field (first one is "password", second is "confirm")
    const passwordFields = screen.getAllByLabelText(/password/i);
    expect(passwordFields.length).toBeGreaterThanOrEqual(2);
  });

  it("shows terms checkbox", async () => {
    const { default: SignupPage } = await import(
      "@/app/(public)/(auth)/signup/page"
    );
    render(<SignupPage />);
    expect(screen.getByRole("checkbox")).toBeInTheDocument();
  });
});

describe("Forgot-password page", () => {
  it("renders email field and submit button", async () => {
    const { default: ForgotPasswordPage } = await import(
      "@/app/(public)/(auth)/forgot-password/page"
    );
    render(<ForgotPasswordPage />);
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /send reset link/i })).toBeInTheDocument();
  });

  it("shows success state after submission", async () => {
    const { default: ForgotPasswordPage } = await import(
      "@/app/(public)/(auth)/forgot-password/page"
    );
    render(<ForgotPasswordPage />);
    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: "user@example.com" },
    });
    fireEvent.click(screen.getByRole("button", { name: /send reset link/i }));
    await waitFor(() => {
      expect(screen.getByText(/check your email/i)).toBeInTheDocument();
    });
  });
});
