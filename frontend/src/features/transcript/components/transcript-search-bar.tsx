"use client";

import React, { useEffect, useState } from "react";
import { Search, X, ChevronUp, ChevronDown } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface TranscriptSearchBarProps {
  value: string;
  onChange: (query: string) => void;
  matchCount: number;
  currentMatchIndex: number;
  onNextMatch: () => void;
  onPrevMatch: () => void;
}

export function TranscriptSearchBar({
  value,
  onChange,
  matchCount,
  currentMatchIndex,
  onNextMatch,
  onPrevMatch,
}: TranscriptSearchBarProps) {
  const [localQuery, setLocalQuery] = useState(value);

  // Debounce search update by 250ms
  useEffect(() => {
    const timer = setTimeout(() => {
      onChange(localQuery);
    }, 250);
    return () => clearTimeout(timer);
  }, [localQuery, onChange]);

  const handleClear = () => {
    setLocalQuery("");
    onChange("");
  };

  return (
    <div className="flex items-center gap-2">
      <div className="relative flex-1 min-w-[200px] max-w-xs">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-bano-text-subtle" />
        <Input
          type="text"
          placeholder="Search transcript..."
          value={localQuery}
          onChange={(e) => setLocalQuery(e.target.value)}
          className="pl-8 pr-8 h-8 text-xs bg-card"
          aria-label="Search transcript"
        />
        {localQuery && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-bano-text-subtle hover:text-foreground"
            aria-label="Clear search"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {localQuery.trim().length > 0 && (
        <div className="flex items-center gap-1.5 text-xs text-bano-text-muted">
          <span>
            {matchCount > 0
              ? `${currentMatchIndex + 1} of ${matchCount}`
              : "0 results"}
          </span>

          <div className="flex items-center">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={matchCount === 0}
              onClick={onPrevMatch}
              className="h-7 w-7 p-0"
              aria-label="Previous match"
            >
              <ChevronUp className="h-3.5 w-3.5" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={matchCount === 0}
              onClick={onNextMatch}
              className="h-7 w-7 p-0"
              aria-label="Next match"
            >
              <ChevronDown className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
