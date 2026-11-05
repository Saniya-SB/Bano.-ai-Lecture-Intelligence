"use client";

import React from "react";
import { env } from "@/config/env";
import { FlaskConical } from "lucide-react";

export function DemoModeBanner() {
  if (!env.USE_MOCK_API) return null;

  return (
    <div
      role="status"
      className="bg-bano-accent-soft text-bano-accent border-b border-bano-accent/20 px-4 py-1.5 text-xs font-mono font-medium flex items-center justify-center gap-2"
    >
      <FlaskConical className="h-3.5 w-3.5" />
      <span>
        DEMO MODE: Showing sample data (Scenario: {env.MOCK_SCENARIO})
      </span>
    </div>
  );
}
