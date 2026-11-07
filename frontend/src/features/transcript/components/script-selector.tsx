"use client";

import React from "react";
import { ScriptMode } from "@/types/domain/transcript";

interface ScriptSelectorProps {
  currentScript: ScriptMode;
  availableScripts: ScriptMode[];
  onScriptChange: (script: ScriptMode) => void;
}

export function ScriptSelector({
  currentScript,
  availableScripts,
  onScriptChange,
}: ScriptSelectorProps) {
  const hasDevanagari = availableScripts.includes("devanagari");
  const hasRoman = availableScripts.includes("roman");

  return (
    <div
      role="group"
      aria-label="Script selection"
      className="inline-flex items-center rounded-lg bg-bano-surface-sunken p-1 text-xs border border-border"
    >
      <button
        type="button"
        disabled={!hasDevanagari}
        onClick={() => onScriptChange("devanagari")}
        className={`px-3 py-1.5 rounded-md font-medium transition-all ${
          currentScript === "devanagari"
            ? "bg-card text-foreground shadow-sm font-semibold"
            : hasDevanagari
            ? "text-bano-text-muted hover:text-foreground"
            : "text-bano-text-subtle opacity-40 cursor-not-allowed"
        }`}
        title={!hasDevanagari ? "Devanagari script not available for this lecture" : "View in Devanagari (Hindi)"}
      >
        <span>देवनागरी</span>
        {!hasDevanagari && <span className="ml-1 text-[10px]">(N/A)</span>}
      </button>

      <button
        type="button"
        disabled={!hasRoman}
        onClick={() => onScriptChange("roman")}
        className={`px-3 py-1.5 rounded-md font-medium transition-all ${
          currentScript === "roman"
            ? "bg-card text-foreground shadow-sm font-semibold"
            : hasRoman
            ? "text-bano-text-muted hover:text-foreground"
            : "text-bano-text-subtle opacity-40 cursor-not-allowed"
        }`}
        title={!hasRoman ? "Roman script not available for this lecture" : "View in Roman Hinglish"}
      >
        <span>Roman Hinglish</span>
        {!hasRoman && <span className="ml-1 text-[10px]">(N/A)</span>}
      </button>
    </div>
  );
}
