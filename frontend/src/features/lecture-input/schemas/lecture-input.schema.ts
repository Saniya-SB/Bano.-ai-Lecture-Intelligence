import { z } from "zod";

// ---------------------------------------------------------------------------
// Candidate MIME types — awaiting Owais confirmation of the definitive list.
// These are used for client-side UI validation only; the backend enforces
// the authoritative set and will return a 400/415 for rejected formats.
// ---------------------------------------------------------------------------
export const CANDIDATE_AUDIO_MIME_TYPES = [
  "audio/mpeg",       // .mp3
  "audio/wav",        // .wav
  "audio/x-wav",     // .wav (some browsers)
  "audio/x-m4a",     // .m4a
  "audio/mp4",        // .m4a / .mp4 audio
  "video/mp4",        // .mp4 (video with audio track)
  "video/webm",       // .webm
  "audio/webm",       // .webm audio
] as const;

export type CandidateMimeType = (typeof CANDIDATE_AUDIO_MIME_TYPES)[number];

export const CANDIDATE_EXTENSIONS = ["mp3", "wav", "m4a", "mp4", "webm"] as const;

export function isAcceptedMimeType(mimeType: string): boolean {
  return (CANDIDATE_AUDIO_MIME_TYPES as readonly string[]).includes(mimeType);
}

/** Build the string needed for <input accept="..."> */
export const ACCEPT_ATTRIBUTE = [
  "audio/mpeg",
  "audio/wav",
  "audio/x-wav",
  "audio/x-m4a",
  "audio/mp4",
  "video/mp4",
  "video/webm",
  "audio/webm",
  ".mp3",
  ".wav",
  ".m4a",
  ".mp4",
  ".webm",
].join(",");

// ---------------------------------------------------------------------------
// Lecture metadata schema — shared by all three input modes
// ---------------------------------------------------------------------------
export const lectureMetadataSchema = z.object({
  title: z
    .string()
    .min(2, "Title must be at least 2 characters")
    .max(120, "Title is too long"),
  subject: z
    .string()
    .min(2, "Subject must be at least 2 characters")
    .max(80, "Subject is too long"),
  topic: z.string().max(120, "Topic is too long").optional(),
});

export type LectureMetadataValues = z.infer<typeof lectureMetadataSchema>;

// ---------------------------------------------------------------------------
// YouTube URL validation
// ---------------------------------------------------------------------------

/**
 * Parses a YouTube URL and extracts the video ID.
 * Supports:
 *   - https://www.youtube.com/watch?v=VIDEO_ID
 *   - https://youtu.be/VIDEO_ID
 *   - https://www.youtube.com/shorts/VIDEO_ID
 *   - URLs with extra query parameters (&t=..., &list=... etc.)
 *
 * Returns the video ID string, or null if the URL is not a recognised
 * YouTube video URL. Never downloads, fetches or scrapes anything.
 */
export function parseYouTubeVideoId(url: string): string | null {
  if (!url || typeof url !== "string") return null;

  let parsed: URL;
  try {
    parsed = new URL(url.trim());
  } catch {
    return null;
  }

  const { hostname, pathname, searchParams } = parsed;

  // Normalise: strip www. prefix
  const host = hostname.replace(/^www\./, "");

  // youtu.be/<ID>
  if (host === "youtu.be") {
    const id = (pathname.slice(1).split("?")[0] ?? "").split("/")[0] ?? "";
    return isValidVideoId(id) ? id : null;
  }

  if (host !== "youtube.com") return null;

  // /watch?v=<ID>
  if (pathname === "/watch") {
    const id = searchParams.get("v");
    return id && isValidVideoId(id) ? id : null;
  }

  // /shorts/<ID>
  if (pathname.startsWith("/shorts/")) {
    const id = (pathname.slice("/shorts/".length).split("?")[0] ?? "").split("/")[0] ?? "";
    return isValidVideoId(id) ? id : null;
  }

  return null;
}

/** YouTube video IDs are 11 alphanumeric/-/_ characters. */
function isValidVideoId(id: string): boolean {
  return /^[\w-]{11}$/.test(id);
}

export const youtubeInputSchema = lectureMetadataSchema.extend({
  youtubeUrl: z
    .string()
    .min(1, "YouTube URL is required")
    .refine(
      (url) => parseYouTubeVideoId(url) !== null,
      "Please enter a valid YouTube video URL (youtube.com/watch?v=... or youtu.be/...)"
    ),
});

export type YouTubeInputValues = z.infer<typeof youtubeInputSchema>;
