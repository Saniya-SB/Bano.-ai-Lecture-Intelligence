/**
 * Transcript API DTO types (snake_case).
 * See docs/API_CONTRACT.md § 3.4.
 *
 * Contract shape for each segment in devanagari_segments / roman_segments:
 *   { id, start_time, end_time, text, segment_type }
 *
 * Additional fields (segment_index, text_devanagari, text_roman,
 * speaker_label, confidence) are non-contract extensions that the backend
 * may include; they are kept optional for forward-compatibility.
 */

export type SegmentType = "concept" | "example" | "admin" | "off_topic";

export interface TranscriptSegmentDto {
  /** Segment ID as returned by backend (e.g. "seg_d1") */
  id: string;
  start_time: number; // seconds (float)
  end_time: number;   // seconds (float)
  /** Primary text for this segment's script (Devanagari or Roman).
   *  Required in the contract response; optional here to stay compatible
   *  with mock fixtures that use text_devanagari / text_roman instead. */
  text?: string;
  segment_type?: SegmentType;
  // Non-contract extras — present in some backend variants:
  segment_index?: number;
  text_devanagari?: string;
  text_roman?: string;
  speaker_label?: string;
  confidence?: number;
}

export interface TranscriptDto {
  id: string;
  lecture_id: string;
  /** Devanagari (Hindi) segments — always present per contract */
  devanagari_segments?: TranscriptSegmentDto[];
  /** Roman (Hinglish) segments — always present per contract */
  roman_segments?: TranscriptSegmentDto[];
  // Legacy / alternative backend formats:
  available_scripts?: Array<"devanagari" | "roman">;
  segments?: TranscriptSegmentDto[];
  created_at?: string;
  updated_at?: string;
}
