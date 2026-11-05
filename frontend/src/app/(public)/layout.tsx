import React from "react";
import { MarketingNavbar } from "@/components/layout/marketing-navbar";
import { Footer } from "@/components/layout/footer";
import { OfflineBanner } from "@/components/shared/offline-banner";

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-bano-bg">
      <OfflineBanner />
      <MarketingNavbar />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}
