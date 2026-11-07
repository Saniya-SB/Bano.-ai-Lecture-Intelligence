"use client";

import React, { useState, useEffect } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SkeletonCard } from "@/components/shared/skeleton-blocks";
import { ErrorState } from "@/components/shared/error-state";
import { useAuth } from "@/hooks/use-auth";
import { FEATURES } from "@/config/features";
import { toast } from "sonner";
import { User as UserIcon, Mail, Calendar, ShieldCheck, Edit2, Check, X, Info } from "lucide-react";

export default function ProfilePage() {
  const { user, isLoading, isError, error, refetch, updateProfile, isUpdatingProfile } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [fullName, setFullName] = useState("");

  useEffect(() => {
    if (user?.fullName) {
      setFullName(user.fullName);
    }
  }, [user?.fullName]);

  const getInitials = (name?: string) => {
    if (!name) return "U";
    return name
      .split(" ")
      .map((part) => part[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) {
      toast.error("Full name cannot be empty.");
      return;
    }

    try {
      await updateProfile({ fullName: fullName.trim() });
      toast.success("Profile updated successfully.");
      setIsEditing(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to update profile";
      toast.error(msg);
    }
  };

  const handleCancel = () => {
    setFullName(user?.fullName || "");
    setIsEditing(false);
  };

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-2xl" data-testid="profile-loading">
        <PageHeader
          title="Student Profile"
          description="View your user identity and academic account details."
        />
        <SkeletonCard />
      </div>
    );
  }

  if (isError || !user) {
    return (
      <div className="space-y-6 max-w-2xl">
        <PageHeader
          title="Student Profile"
          description="View your user identity and academic account details."
        />
        <ErrorState
          title="Profile unavailable"
          message={error?.message || "Could not retrieve account details. Please retry or sign in again."}
          onRetry={() => refetch()}
        />
      </div>
    );
  }

  const formattedDate = user.createdAt
    ? new Date(user.createdAt).toLocaleDateString("en-IN", {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : "Not available";

  return (
    <div className="space-y-6 max-w-2xl">
      <PageHeader
        title="Student Profile"
        description="View your user identity and academic account details."
      />

      <Card className="p-6 space-y-6">
        {/* User Avatar & Basic Info */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16 border-2 border-bano-accent/20">
              <AvatarFallback className="text-lg font-heading font-semibold bg-bano-accent-soft text-bano-accent">
                {getInitials(user.fullName)}
              </AvatarFallback>
            </Avatar>
            <div>
              <h3 className="font-heading font-semibold text-lg text-foreground">
                {user.fullName}
              </h3>
              <p className="font-mono text-xs text-bano-text-subtle">
                {user.email}
              </p>
            </div>
          </div>

          {FEATURES.profileUpdate && !isEditing && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsEditing(true)}
              className="gap-1.5"
            >
              <Edit2 className="h-3.5 w-3.5 text-bano-text-muted" />
              Edit Profile
            </Button>
          )}
        </div>

        {/* Profile Details or Edit Form */}
        {isEditing ? (
          <form onSubmit={handleSave} className="space-y-4 pt-4 border-t border-border">
            <div className="space-y-2">
              <Label htmlFor="fullName">Full Name</Label>
              <Input
                id="fullName"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                disabled={isUpdatingProfile}
                required
                className="max-w-md"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                value={user.email}
                disabled
                className="max-w-md bg-bano-surface-sunken cursor-not-allowed text-bano-text-muted"
              />
              <p className="text-xs text-bano-text-subtle">
                Email address cannot be changed directly.
              </p>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <Button type="submit" size="sm" disabled={isUpdatingProfile} className="gap-1.5">
                <Check className="h-3.5 w-3.5" />
                {isUpdatingProfile ? "Saving..." : "Save Changes"}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleCancel}
                disabled={isUpdatingProfile}
                className="gap-1.5"
              >
                <X className="h-3.5 w-3.5" />
                Cancel
              </Button>
            </div>
          </form>
        ) : (
          <div className="space-y-3 pt-4 border-t border-border">
            <div className="flex items-center gap-3 text-sm py-1.5">
              <UserIcon className="h-4 w-4 text-bano-text-muted shrink-0" />
              <span className="text-bano-text-muted w-28">Full Name:</span>
              <span className="font-medium text-foreground">{user.fullName}</span>
            </div>

            <div className="flex items-center gap-3 text-sm py-1.5">
              <Mail className="h-4 w-4 text-bano-text-muted shrink-0" />
              <span className="text-bano-text-muted w-28">Email:</span>
              <span className="font-mono text-sm text-foreground">{user.email}</span>
            </div>

            <div className="flex items-center gap-3 text-sm py-1.5">
              <Calendar className="h-4 w-4 text-bano-text-muted shrink-0" />
              <span className="text-bano-text-muted w-28">Member Since:</span>
              <span className="text-foreground">{formattedDate}</span>
            </div>

            <div className="flex items-center gap-3 text-sm py-1.5">
              <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" />
              <span className="text-bano-text-muted w-28">Role:</span>
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                Student
              </span>
            </div>
          </div>
        )}

        {!FEATURES.profileUpdate && (
          <div className="rounded-md bg-bano-surface-sunken p-3 text-xs text-bano-text-muted flex items-center gap-2">
            <Info className="h-4 w-4 text-bano-text-muted shrink-0" />
            <span>Profile editing is read-only until backend update endpoint confirmation.</span>
          </div>
        )}
      </Card>
    </div>
  );
}
