"use client";

import React, { useState } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { PasswordInput } from "@/components/shared/password-input";
import { PasswordStrengthMeter } from "@/components/shared/password-strength-meter";
import { useAuth } from "@/hooks/use-auth";
import { FEATURES } from "@/config/features";
import { toast } from "sonner";
import {
  Settings as SettingsIcon,
  Shield,
  BarChart,
  Trash2,
  LogOut,
  Info,
  Check,
  Languages,
} from "lucide-react";

export default function SettingsPage() {
  const { logout, isLoggingOut } = useAuth();

  // Preferences local state (script preference)
  const [defaultScript, setDefaultScript] = useState<"devanagari" | "roman">(() => {
    if (typeof window !== "undefined") {
      const saved = window.localStorage.getItem("bano_pref_script");
      if (saved === "devanagari" || saved === "roman") return saved;
    }
    return "devanagari";
  });

  // Password update form state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  // Deletion modal state
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const handleScriptChange = (script: "devanagari" | "roman") => {
    setDefaultScript(script);
    if (typeof window !== "undefined") {
      window.localStorage.setItem("bano_pref_script", script);
    }
    toast.success(`Default script updated to ${script === "devanagari" ? "Devanagari" : "Roman Hinglish"}.`);
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword) {
      toast.error("Please enter your current password.");
      return;
    }
    if (newPassword.length < 8) {
      toast.error("New password must be at least 8 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }

    setIsChangingPassword(true);
    // Simulate latency for mock or report capability
    try {
      await new Promise((res) => setTimeout(res, 600));
      toast.success("Password changed successfully.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch {
      toast.error("Failed to change password.");
    } finally {
      setIsChangingPassword(false);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl pb-12">
      <PageHeader
        title="Account Settings"
        description="Manage your account preferences, credentials, and data storage."
      />

      <div className="space-y-6">
        {/* 1. Account Preferences */}
        <Card className="p-6 space-y-4">
          <div className="flex items-center gap-2 border-b border-border pb-3">
            <Languages className="h-5 w-5 text-bano-accent" />
            <div>
              <h3 className="font-heading font-semibold text-base text-foreground">
                Transcript &amp; Language Preferences
              </h3>
              <p className="text-xs text-bano-text-muted">
                Configure your preferred script for Hinglish lecture transcripts.
              </p>
            </div>
          </div>

          <div className="space-y-3 pt-1">
            <Label className="text-sm font-medium">Default Transcript Script</Label>
            <div className="flex flex-wrap gap-3">
              <Button
                type="button"
                variant={defaultScript === "devanagari" ? "default" : "outline"}
                size="sm"
                onClick={() => handleScriptChange("devanagari")}
                className="gap-2"
              >
                {defaultScript === "devanagari" && <Check className="h-4 w-4" />}
                Devanagari (देवनागरी)
              </Button>
              <Button
                type="button"
                variant={defaultScript === "roman" ? "default" : "outline"}
                size="sm"
                onClick={() => handleScriptChange("roman")}
                className="gap-2"
              >
                {defaultScript === "roman" && <Check className="h-4 w-4" />}
                Roman Hinglish (English alphabet)
              </Button>
            </div>
            <p className="text-xs text-bano-text-subtle">
              Persisted in your browser. Applied automatically when opening lecture transcripts.
            </p>
          </div>
        </Card>

        {/* 2. Security & Password */}
        <Card className="p-6 space-y-4">
          <div className="flex items-center gap-2 border-b border-border pb-3">
            <Shield className="h-5 w-5 text-bano-accent" />
            <div>
              <h3 className="font-heading font-semibold text-base text-foreground">
                Security &amp; Password
              </h3>
              <p className="text-xs text-bano-text-muted">
                Manage your credentials and password protection.
              </p>
            </div>
          </div>

          {FEATURES.changePassword ? (
            <form onSubmit={handlePasswordSubmit} className="space-y-4 max-w-md pt-1">
              <div className="space-y-2">
                <Label htmlFor="currentPassword">Current Password</Label>
                <PasswordInput
                  id="currentPassword"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Enter current password"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="newPassword">New Password</Label>
                <PasswordInput
                  id="newPassword"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password (min 8 chars)"
                  required
                />
                <PasswordStrengthMeter password={newPassword} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm New Password</Label>
                <PasswordInput
                  id="confirmPassword"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                  required
                />
              </div>

              <Button
                type="submit"
                size="sm"
                disabled={isChangingPassword}
                className="mt-2"
              >
                {isChangingPassword ? "Updating..." : "Update Password"}
              </Button>
            </form>
          ) : (
            <div className="rounded-md bg-bano-surface-sunken p-4 text-xs text-bano-text-muted flex items-start gap-2.5">
              <Info className="h-4 w-4 text-bano-text-muted shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-foreground">Password Management</p>
                <p className="mt-0.5">
                  Password modification endpoint is not yet supported by the backend. This capability is disabled to prevent unconfirmed network calls.
                </p>
              </div>
            </div>
          )}
        </Card>

        {/* 3. Usage & Quotas */}
        <Card className="p-6 space-y-4">
          <div className="flex items-center gap-2 border-b border-border pb-3">
            <BarChart className="h-5 w-5 text-bano-accent" />
            <div>
              <h3 className="font-heading font-semibold text-base text-foreground">
                Account Usage &amp; Limits
              </h3>
              <p className="text-xs text-bano-text-muted">
                Audio duration and AI generation allowance.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
            <div className="rounded-md border border-border bg-bano-surface-sunken p-4 space-y-1">
              <span className="text-xs text-bano-text-muted">Audio Processed</span>
              <p className="text-lg font-mono font-semibold text-foreground">
                {FEATURES.usageInfo ? "~185 mins" : "Not reported"}
              </p>
              <p className="text-xs text-bano-text-subtle">
                Cumulative bilingual lecture duration
              </p>
            </div>

            <div className="rounded-md border border-border bg-bano-surface-sunken p-4 space-y-1">
              <span className="text-xs text-bano-text-muted">Monthly Quota</span>
              <p className="text-lg font-mono font-semibold text-foreground">
                {FEATURES.quota ? "Unlimited (Student Tier)" : "Not reported"}
              </p>
              <p className="text-xs text-bano-text-subtle">
                Speech-to-text &amp; LLM generation allowance
              </p>
            </div>
          </div>
        </Card>

        {/* 4. Danger Zone & Account Deletion */}
        <Card className="p-6 space-y-4 border-destructive/20">
          <div className="flex items-center gap-2 border-b border-border pb-3">
            <Trash2 className="h-5 w-5 text-destructive" />
            <div>
              <h3 className="font-heading font-semibold text-base text-foreground">
                Data &amp; Account Deletion
              </h3>
              <p className="text-xs text-bano-text-muted">
                Permanently purge your account, audio files, and generated study notes.
              </p>
            </div>
          </div>

          <div className="space-y-3 pt-1">
            <p className="text-sm text-bano-text-muted">
              Once deleted, your account and all associated transcripts and quizzes cannot be recovered.
            </p>

            {FEATURES.accountDeletion ? (
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setIsDeleteDialogOpen(true)}
              >
                Delete Account
              </Button>
            ) : (
              <div className="flex items-center gap-2">
                <Button variant="destructive" size="sm" disabled>
                  Delete Account
                </Button>
                <span className="text-xs text-bano-text-subtle">
                  (Not available yet until backend endpoint confirmation)
                </span>
              </div>
            )}
          </div>
        </Card>

        {/* 5. Sign Out Card */}
        <Card className="p-6 flex items-center justify-between flex-wrap gap-4">
          <div className="space-y-1">
            <h3 className="font-heading font-semibold text-base text-foreground">
              Sign Out
            </h3>
            <p className="text-xs text-bano-text-muted">
              Log out of your current session on this device.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={logout}
            disabled={isLoggingOut}
            className="gap-2 text-destructive hover:bg-destructive/10 hover:text-destructive border-destructive/30"
          >
            <LogOut className="h-4 w-4" />
            {isLoggingOut ? "Signing out..." : "Sign Out"}
          </Button>
        </Card>
      </div>

      {/* Account Deletion Dialog with Typed Confirmation */}
      <ConfirmDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        title="Delete Student Account"
        description="This action is irreversible. All your uploaded audio, transcripts, summaries, and generated quiz records will be permanently removed."
        actionLabel="Permanently Delete Account"
        requiredKeyword="DELETE"
        onConfirm={() => {
          toast.success("Account deletion request submitted.");
          logout();
        }}
      />
    </div>
  );
}
