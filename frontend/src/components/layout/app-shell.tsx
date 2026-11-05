"use client";

import React from "react";
import { Sidebar } from "./sidebar";
import { Header } from "./header";
import { DemoModeBanner } from "@/components/shared/demo-mode-banner";
import { OfflineBanner } from "@/components/shared/offline-banner";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { ROUTES } from "@/config/routes";

interface AppShellProps {
  children: React.ReactNode;
  title?: string;
}

export function AppShell({ children, title }: AppShellProps) {
  const router = useRouter();
  const { isAuthenticated, isLoading, isError } = useAuth();

  useEffect(() => {
    if (!isLoading && (!isAuthenticated || isError)) {
      router.replace(ROUTES.LOGIN);
    }
  }, [isLoading, isAuthenticated, isError, router]);

  if (isLoading || !isAuthenticated || isError) {
    return null;
  }
  return (
    <div className="flex min-h-screen flex-col bg-bano-bg">
      <OfflineBanner />
      <DemoModeBanner />
      <div className="flex flex-1">
        {/* Desktop Sidebar */}
        <Sidebar className="hidden lg:flex min-h-screen sticky top-0 h-screen" />

        {/* Main Content Area */}
        <div className="flex flex-1 flex-col min-w-0">
          <Header title={title} />
          <main className="flex-1 p-4 sm:p-6 lg:p-8">
            <div className="mx-auto max-w-[1120px]">{children}</div>
          </main>
        </div>
      </div>
    </div>
  );
}
