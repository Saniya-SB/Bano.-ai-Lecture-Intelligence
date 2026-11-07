import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import React from "react";
import ProfilePage from "@/app/(dashboard)/profile/page";
import SettingsPage from "@/app/(dashboard)/settings/page";
import * as authHook from "@/hooks/use-auth";
import { User } from "@/types/domain/common";

const mockUser: User = {
  id: "usr_mock_1",
  email: "student@bano.ai",
  fullName: "Aman Sharma",
  createdAt: "2026-11-01T10:00:00Z",
};

describe("M8 Profile & Settings Pages", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("ProfilePage", () => {
    it("renders user information and initials correctly", () => {
      vi.spyOn(authHook, "useAuth").mockReturnValue({
        user: mockUser,
        isLoading: false,
        isError: false,
        error: null,
        isAuthenticated: true,
        refetch: vi.fn(),
        updateProfile: vi.fn(),
        isUpdatingProfile: false,
        updateProfileError: null,
        logout: vi.fn(),
        isLoggingOut: false,
      });

      render(<ProfilePage />);

      expect(screen.getAllByText("Aman Sharma").length).toBeGreaterThan(0);
      expect(screen.getAllByText("student@bano.ai").length).toBeGreaterThan(0);
      expect(screen.getByText("AS")).toBeInTheDocument();
      expect(screen.getByText("Student")).toBeInTheDocument();
    });

    it("renders loading state with skeleton placeholders", () => {
      vi.spyOn(authHook, "useAuth").mockReturnValue({
        user: null,
        isLoading: true,
        isError: false,
        error: null,
        isAuthenticated: false,
        refetch: vi.fn(),
        updateProfile: vi.fn(),
        isUpdatingProfile: false,
        updateProfileError: null,
        logout: vi.fn(),
        isLoggingOut: false,
      });

      render(<ProfilePage />);
      expect(screen.getByTestId("profile-loading")).toBeInTheDocument();
    });

    it("renders error state when user data fails to load", () => {
      const mockRefetch = vi.fn();
      vi.spyOn(authHook, "useAuth").mockReturnValue({
        user: null,
        isLoading: false,
        isError: true,
        error: new Error("Unauthorized session"),
        isAuthenticated: false,
        refetch: mockRefetch,
        updateProfile: vi.fn(),
        isUpdatingProfile: false,
        updateProfileError: null,
        logout: vi.fn(),
        isLoggingOut: false,
      });

      render(<ProfilePage />);
      expect(screen.getByText("Profile unavailable")).toBeInTheDocument();
      expect(screen.getByText("Unauthorized session")).toBeInTheDocument();
    });

    it("supports profile editing when enabled by feature flag", async () => {
      const mockUpdate = vi.fn().mockResolvedValue({ ...mockUser, fullName: "Aman Verma" });
      vi.spyOn(authHook, "useAuth").mockReturnValue({
        user: mockUser,
        isLoading: false,
        isError: false,
        error: null,
        isAuthenticated: true,
        refetch: vi.fn(),
        updateProfile: mockUpdate,
        isUpdatingProfile: false,
        updateProfileError: null,
        logout: vi.fn(),
        isLoggingOut: false,
      });

      render(<ProfilePage />);

      const editBtn = screen.getByRole("button", { name: /Edit Profile/i });
      fireEvent.click(editBtn);

      const input = screen.getByLabelText(/Full Name/i);
      fireEvent.change(input, { target: { value: "Aman Verma" } });

      const saveBtn = screen.getByRole("button", { name: /Save Changes/i });
      fireEvent.click(saveBtn);

      await waitFor(() => {
        expect(mockUpdate).toHaveBeenCalledWith({ fullName: "Aman Verma" });
      });
    });
  });

  describe("SettingsPage", () => {
    it("renders preference controls, usage info, and sign out button", () => {
      const mockLogout = vi.fn();
      vi.spyOn(authHook, "useAuth").mockReturnValue({
        user: mockUser,
        isLoading: false,
        isError: false,
        error: null,
        isAuthenticated: true,
        refetch: vi.fn(),
        updateProfile: vi.fn(),
        isUpdatingProfile: false,
        updateProfileError: null,
        logout: mockLogout,
        isLoggingOut: false,
      });

      render(<SettingsPage />);

      expect(screen.getByText("Account Settings")).toBeInTheDocument();
      expect(screen.getByText("Transcript & Language Preferences")).toBeInTheDocument();
      expect(screen.getByText("Account Usage & Limits")).toBeInTheDocument();
      expect(screen.getByText("Data & Account Deletion")).toBeInTheDocument();

      const signOutBtn = screen.getByRole("button", { name: /Sign Out/i });
      fireEvent.click(signOutBtn);
      expect(mockLogout).toHaveBeenCalledTimes(1);
    });

    it("allows switching script preferences and persists to localStorage", () => {
      vi.spyOn(authHook, "useAuth").mockReturnValue({
        user: mockUser,
        isLoading: false,
        isError: false,
        error: null,
        isAuthenticated: true,
        refetch: vi.fn(),
        updateProfile: vi.fn(),
        isUpdatingProfile: false,
        updateProfileError: null,
        logout: vi.fn(),
        isLoggingOut: false,
      });

      render(<SettingsPage />);

      const romanBtn = screen.getByRole("button", { name: /Roman Hinglish/i });
      fireEvent.click(romanBtn);

      expect(window.localStorage.getItem("bano_pref_script")).toBe("roman");
    });
  });
});
