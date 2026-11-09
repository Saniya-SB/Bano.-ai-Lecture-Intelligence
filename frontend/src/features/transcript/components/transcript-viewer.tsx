"use client";

import React, { useState, useMemo } from "react";
import { Transcript, ScriptMode, SegmentType } from "@/types/domain/transcript";
import { ScriptSelector } from "./script-selector";
import { TranscriptSearchBar } from "./transcript-search-bar";
import { formatTimestamp } from "@/lib/formatters";
import { Button } from "@/components/ui/button";
import {
  Copy,
  Check,
  FileText,
  Megaphone,
  Coffee,
  BookOpen,
  Code2,
} from "lucide-react";
import { toast } from "sonner";

interface TranscriptViewerProps {
  transcript: Transcript;
  glossaryTerms?: string[];
  onTimestampClick?: (timestampSeconds: number) => void;
}

export function TranscriptViewer({
  transcript,
  glossaryTerms = [],
  onTimestampClick,
}: TranscriptViewerProps) {
  const defaultScript: ScriptMode = transcript.availableScripts.includes("devanagari")
    ? "devanagari"
    : "roman";
  const [currentScript, setCurrentScript] = useState<ScriptMode>(defaultScript);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0);
  const [copied, setCopied] = useState(false);

  // Collapsed off-topic segments state
  const [isOffTopicExpanded, setIsOffTopicExpanded] = useState<Record<string, boolean>>({});

  const toggleOffTopicCollapse = (segmentId: string) => {
    setIsOffTopicExpanded((prev) => ({
      ...prev,
      [segmentId]: !prev[segmentId],
    }));
  };
  const cleanedGlossaryTerms = useMemo(() => {
    return Array.from(
      new Set(
        glossaryTerms
          .map((t) => t.trim())
          .filter((t) => t.length > 1)
      )
    ).sort((a, b) => b.length - a.length); // match longest first
  }, [glossaryTerms]);

  // Compute matches
  const { segmentsWithMatches, totalMatches } = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) {
      return {
        segmentsWithMatches: transcript.segments.map((s) => ({
          ...s,
          hasMatch: false,
          matchIndices: [] as number[],
        })),
        totalMatches: 0,
      };
    }

    let matchCount = 0;
    const mapped = transcript.segments.map((seg) => {
      const text =
        currentScript === "devanagari" ? seg.textDevanagari : seg.textRoman;
      const lowerText = text.toLowerCase();
      const matchIndices: number[] = [];

      let startIndex = 0;
      while ((startIndex = lowerText.indexOf(query, startIndex)) !== -1) {
        matchIndices.push(startIndex);
        matchCount++;
        startIndex += query.length;
      }

      return {
        ...seg,
        hasMatch: matchIndices.length > 0,
        matchIndices,
      };
    });

    return { segmentsWithMatches: mapped, totalMatches: matchCount };
  }, [transcript.segments, currentScript, searchQuery]);

  const handleNextMatch = () => {
    if (totalMatches === 0) return;
    setCurrentMatchIndex((prev) => (prev + 1) % totalMatches);
  };

  const handlePrevMatch = () => {
    if (totalMatches === 0) return;
    setCurrentMatchIndex((prev) => (prev - 1 + totalMatches) % totalMatches);
  };

  const handleCopy = async (includeTimestamps: boolean) => {
    try {
      const text = transcript.segments
        .map((seg) => {
          const body =
            currentScript === "devanagari" ? seg.textDevanagari : seg.textRoman;
          if (includeTimestamps) {
            return `[${formatTimestamp(seg.startTime)}] ${body}`;
          }
          return body;
        })
        .join("\n\n");

      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success(
        includeTimestamps
          ? "Copied transcript with timestamps."
          : "Copied transcript text."
      );
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy transcript to clipboard.");
    }
  };

  // Helper to highlight search matches AND apply marigold highlighter underline to technical terms
  const renderFormattedText = (text: string) => {
    const query = searchQuery.trim();

    // If no search query and no glossary terms, return plain text
    if (!query && cleanedGlossaryTerms.length === 0) {
      return text;
    }

    // Build regex to capture search match or glossary terms
    const patterns: string[] = [];
    if (query) {
      patterns.push(query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
    }
    cleanedGlossaryTerms.forEach((term) => {
      patterns.push(term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
    });

    if (patterns.length === 0) return text;

    const regex = new RegExp(`(${patterns.join("|")})`, "gi");
    const parts = text.split(regex);

    return parts.map((part, i) => {
      if (!part) return null;
      const lowerPart = part.toLowerCase();

      // Priority 1: Search match
      if (query && lowerPart === query.toLowerCase()) {
        return (
          <mark
            key={i}
            className="bg-bano-accent text-bano-text font-semibold px-1 rounded-sm"
          >
            {part}
          </mark>
        );
      }

      // Priority 2: Technical glossary term (highlighter-style underline per Design Brief)
      const isGlossaryTerm = cleanedGlossaryTerms.some(
        (t) => t.toLowerCase() === lowerPart
      );
      if (isGlossaryTerm) {
        return (
          <span
            key={i}
            className="highlighter-term cursor-help"
            title={`Technical term: ${part}`}
          >
            {part}
          </span>
        );
      }

      return part;
    });
  };

  const renderSegmentBadge = (type?: SegmentType) => {
    switch (type) {
      case "off_topic":
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-bano-text-subtle bg-bano-surface-sunken px-2 py-0.5 rounded border border-border">
            <Coffee className="h-3 w-3" /> Off-Topic
          </span>
        );
      case "admin":
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-bano-secondary-ink bg-bano-info-soft px-2 py-0.5 rounded border border-bano-secondary-ink/20">
            <Megaphone className="h-3 w-3" /> Announcement
          </span>
        );
      case "example":
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-bano-text bg-bano-surface-sunken px-2 py-0.5 rounded border border-border">
            <Code2 className="h-3 w-3 text-bano-secondary-ink" /> Example
          </span>
        );
      case "concept":
      default:
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-bano-text-muted bg-bano-surface-sunken px-2 py-0.5 rounded border border-border">
            <BookOpen className="h-3 w-3" /> Concept
          </span>
        );
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Controls Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-card rounded-md border border-border">
        <div className="flex flex-wrap items-center gap-3">
          <ScriptSelector
            currentScript={currentScript}
            availableScripts={transcript.availableScripts}
            onScriptChange={(script) => {
              setCurrentScript(script);
              setCurrentMatchIndex(0);
            }}
          />

          <TranscriptSearchBar
            value={searchQuery}
            onChange={(q) => {
              setSearchQuery(q);
              setCurrentMatchIndex(0);
            }}
            matchCount={totalMatches}
            currentMatchIndex={currentMatchIndex}
            onNextMatch={handleNextMatch}
            onPrevMatch={handlePrevMatch}
          />
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 shrink-0">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => handleCopy(false)}
            className="text-xs h-8"
          >
            {copied ? (
              <Check className="h-3.5 w-3.5 mr-1 text-bano-success" />
            ) : (
              <Copy className="h-3.5 w-3.5 mr-1 text-bano-text-subtle" />
            )}
            Copy
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => handleCopy(true)}
            className="text-xs h-8 text-bano-text-muted hover:text-bano-text"
            title="Copy with timestamps"
          >
            With Timestamps
          </Button>
        </div>
      </div>

      {/* Two-Column Reading Layout (per docs/DESIGN_BRIEF.md) */}
      <div
        className="p-6 bg-card rounded-md border border-border divide-y divide-border/60 max-h-[750px] overflow-y-auto"
        tabIndex={0}
        aria-label="Transcript content"
      >
        {segmentsWithMatches.length === 0 ? (
          <div className="text-center py-12 text-bano-text-muted">
            <FileText className="h-8 w-8 mx-auto mb-2 text-bano-text-subtle opacity-60" />
            <p className="font-medium text-sm">No transcript segments available.</p>
          </div>
        ) : (
          segmentsWithMatches.map((segment) => {
            const rawText =
              currentScript === "devanagari"
                ? segment.textDevanagari
                : segment.textRoman;

            const isDevanagari = currentScript === "devanagari";
            const isOffTopic = segment.segmentType === "off_topic";
            const isAdmin = segment.segmentType === "admin";

            return (
              <div
                key={segment.id}
                id={`seg-${segment.id}`}
                style={{ contentVisibility: "auto" }}
                className={`py-4 first:pt-0 last:pb-0 grid grid-cols-1 md:grid-cols-[140px_1fr] gap-3 md:gap-6 items-baseline transition-colors ${
                  isOffTopic ? "opacity-60 bg-bano-surface-sunken/40 px-3 rounded" : ""
                } ${isAdmin ? "bg-bano-info-soft/30 px-3 rounded" : ""}`}
              >
                {/* Margin Column: Left-aligned timestamp & classification badge */}
                <div className="flex md:flex-col items-center md:items-start justify-between md:justify-start gap-1.5 select-none shrink-0">
                  {onTimestampClick ? (
                    <button
                      type="button"
                      onClick={() => onTimestampClick(segment.startTime)}
                      className="font-mono text-xs text-bano-secondary-ink hover:underline font-semibold focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring rounded px-1 -ml-1"
                      title="Jump to audio timestamp"
                    >
                      {formatTimestamp(segment.startTime)}
                    </button>
                  ) : (
                    <span className="font-mono text-xs text-bano-text-subtle font-medium">
                      {formatTimestamp(segment.startTime)}
                    </span>
                  )}

                  {renderSegmentBadge(segment.segmentType)}

                  {isOffTopic && (
                    <button
                      type="button"
                      onClick={() => toggleOffTopicCollapse(segment.id)}
                      className="text-[10px] text-bano-text-subtle hover:text-bano-text font-medium underline mt-0.5"
                      aria-label={isOffTopicExpanded[segment.id] ? "Collapse off-topic segment" : "Expand off-topic segment"}
                    >
                      {isOffTopicExpanded[segment.id] ? "Collapse" : "Expand"}
                    </button>
                  )}
                </div>

                {/* Content Column: Text-first reading layout */}
                <div
                  lang={isDevanagari ? "hi" : "hi-Latn"}
                  className={`leading-relaxed ${
                    isOffTopic
                      ? "italic text-bano-text-muted text-sm"
                      : "text-bano-text text-base"
                  } ${
                    isDevanagari
                      ? "font-devanagari text-[17px] leading-[1.8]"
                      : "font-sans text-[16px] leading-[1.75]"
                  }`}
                >
                  {isOffTopic && !isOffTopicExpanded[segment.id] ? (
                    <span className="text-xs text-bano-text-subtle">
                      Off-topic discussion hidden ({formatTimestamp(segment.startTime)} - {formatTimestamp(segment.endTime)}). Click &ldquo;Expand&rdquo; to view.
                    </span>
                  ) : (
                    renderFormattedText(rawText)
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
