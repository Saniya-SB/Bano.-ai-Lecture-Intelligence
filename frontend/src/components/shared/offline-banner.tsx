"use client";

import React from "react";
import { useOnlineStatus } from "@/hooks/use-online-status";
import { WifiOff } from "lucide-react";

export function OfflineBanner() {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div
      role="alert"
      className="bg-bano-warning text-white px-4 py-2 text-xs font-medium flex items-center justify-center gap-2 sticky top-0 z-50 shadow-sm"
    >
      <WifiOff className="h-4 w-4" />
      <span>You appear to be offline. Reconnecting when connection is restored...</span>
    </div>
  );
}
