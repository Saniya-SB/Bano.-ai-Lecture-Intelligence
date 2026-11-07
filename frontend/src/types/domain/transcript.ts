export type ScriptMode = "devanagari" | "roman";
export type SegmentType = "concept" | "example" | "admin" | "off_topic";

export interface TranscriptSegment {
  id: string;
  segmentIndex: number;
  startTime: number; // in seconds
  endTime: number; // in seconds
  textDevanagari: string;
  textRoman: string;
  segmentType?: SegmentType;
  speakerLabel?: string;
  confidence?: number;
}

export interface Transcript {
  id: string;
  lectureId: string;
  availableScripts: ScriptMode[];
  segments: TranscriptSegment[];
}
