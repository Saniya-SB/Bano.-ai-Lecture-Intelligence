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
  ChevronDown,
  ChevronRight,
  Megaphone,
  Coffee,
  BookOpen,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";

interface TranscriptViewerProps {
  transcript: Transcript;
  onTimestampClick?: (timestampSeconds: number) => void;
}

export function TranscriptViewer({
  transcript,
  onTimestampClick,
}: TranscriptViewerProps) {
  // Client-side script preference
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

  // Copy visible script text with optional timestamps
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

  // Helper to render text with highlighted search query
  const renderHighlightedText = (text: string) => {
    const query = searchQuery.trim();
    if (!query) return text;

    const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi");
    const parts = text.split(regex);

    return parts.map((part, i) =>
      regex.test(part) ? (
        <mark
          key={i}
          className="bg-bano-accent-soft text-foreground font-semibold px-0.5 rounded"
        >
          {part}
        </mark>
      ) : (
        part
      )
    );
  };

  // Helper badge for segment classification
  const renderSegmentBadge = (type?: SegmentType) => {
    switch (type) {
      case "off_topic":
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-bano-text-subtle bg-bano-surface-sunken px-2 py-0.5 rounded-full border border-border">
            <Coffee className="h-3 w-3" /> Off-Topic
          </span>
        );
      case "admin":
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-bano-accent bg-bano-accent-soft px-2 py-0.5 rounded-full">
            <Megaphone className="h-3 w-3" /> Announcement
          </span>
        );
      case "example":
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-bano-info bg-bano-info-soft px-2 py-0.5 rounded-full">
            <Sparkles className="h-3 w-3" /> Example
          </span>
        );
      case "concept":
      default:
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-bano-text-muted bg-bano-surface-sunken px-2 py-0.5 rounded-full">
            <BookOpen className="h-3 w-3" /> Concept
          </span>
        );
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-card rounded-lg border border-border">
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

        {/* Copy actions */}
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
            className="text-xs h-8 text-bano-text-muted hover:text-foreground"
            title="Copy with timestamps"
          >
            With Timestamps
          </Button>
        </div>
      </div>

      {/* Segments Display Area */}
      <div
        className="p-6 bg-bano-surface-sunken rounded-lg border border-border space-y-4 max-h-[700px] overflow-y-auto"
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
            const isExpanded = isOffTopicExpanded[segment.id] ?? false;

            return (
              <div
                key={segment.id}
                style={{ contentVisibility: "auto" }}
                className={`group flex flex-col p-3 rounded-md transition-colors border ${
                  isOffTopic
                    ? "bg-card/40 border-dashed border-border opacity-70"
                    : isAdmin
                    ? "bg-bano-accent-soft/20 border-bano-accent/20"
                    : "hover:bg-card/70 border-transparent"
                }`}
              >
                {/* Segment Header: Timestamp + Classification Badge + Optional Collapse */}
                <div className="flex items-center justify-between pb-1 gap-2">
                  <div className="flex items-center gap-2">
                    {onTimestampClick ? (
                      <button
                        type="button"
                        onClick={() => onTimestampClick(segment.startTime)}
                        className="font-mono text-xs text-bano-accent hover:underline font-medium select-none"
                        title="Jump to timestamp"
                      >
                        {formatTimestamp(segment.startTime)}
                      </button>
                    ) : (
                      <span className="font-mono text-xs text-bano-text-subtle select-none font-medium">
                        {formatTimestamp(segment.startTime)}
                      </span>
                    )}

                    {renderSegmentBadge(segment.segmentType)}
                  </div>

                  {/* Off-topic collapse toggle */}
                  {isOffTopic && (
                    <button
                      type="button"
                      onClick={() => toggleOffTopicCollapse(segment.id)}
                      className="inline-flex items-center gap-1 text-[11px] text-bano-text-muted hover:text-foreground font-medium"
                      aria-expanded={isExpanded}
                      aria-label={isExpanded ? "Collapse off-topic segment" : "Expand off-topic segment"}
                    >
                      {isExpanded ? (
                        <>
                          <span>Collapse</span>
                          <ChevronDown className="h-3 w-3" />
                        </>
                      ) : (
                        <>
                          <span>Show off-topic talk</span>
                          <ChevronRight className="h-3 w-3" />
                        </>
                      )}
                    </button>
                  )}
                </div>

                {/* Text Body (Collapsed if off-topic and not toggled) */}
                {(!isOffTopic || isExpanded) ? (
                  <div
                    lang={isDevanagari ? "hi" : "hi-Latn"}
                    className={`mt-1 text-foreground leading-relaxed ${
                      isOffTopic ? "italic text-bano-text-muted text-sm" : ""
                    } ${
                      isDevanagari
                        ? "font-devanagari text-base"
                        : "font-sans text-sm"
                    }`}
                  >
                    {renderHighlightedText(rawText)}
                  </div>
                ) : (
                  <p className="mt-0.5 text-xs text-bano-text-subtle italic">
                    Off-topic discussion hidden ({formatTimestamp(segment.startTime)} - {formatTimestamp(segment.endTime)}). Click &ldquo;Show off-topic talk&rdquo; to expand.
                  </p>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
