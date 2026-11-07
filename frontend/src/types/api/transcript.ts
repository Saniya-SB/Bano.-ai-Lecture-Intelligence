/**
 * PROVISIONAL - Pending backend contract confirmation with Owais (Q10, Q11).
 * Field names follow backend snake_case convention.
 */

export interface TranscriptSegmentDto {
  id: string;
  segment_index: number;
  start_time: number; // in seconds (float or int)
  end_time: number; // in seconds (float or int)
  text_devanagari: string;
  text_roman: string;
  speaker_label?: string;
  confidence?: number;
}

export interface TranscriptDto {
  id: string;
  lecture_id: string;
  available_scripts: Array<"devanagari" | "roman">;
  segments: TranscriptSegmentDto[];
  created_at?: string;
  updated_at?: string;
}
