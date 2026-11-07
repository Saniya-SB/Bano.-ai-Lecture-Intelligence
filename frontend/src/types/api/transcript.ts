export type SegmentType = "concept" | "example" | "admin" | "off_topic";

export interface TranscriptSegmentDto {
  id: string;
  segment_index?: number;
  start_time: number; // in seconds (float or int)
  end_time: number; // in seconds (float or int)
  text_devanagari?: string;
  text_roman?: string;
  text?: string;
  segment_type?: SegmentType;
  speaker_label?: string;
  confidence?: number;
}

export interface TranscriptDto {
  id: string;
  lecture_id: string;
  available_scripts?: Array<"devanagari" | "roman">;
  segments?: TranscriptSegmentDto[];
  roman_segments?: TranscriptSegmentDto[];
  devanagari_segments?: TranscriptSegmentDto[];
  created_at?: string;
  updated_at?: string;
}
