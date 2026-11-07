export type ScriptMode = "devanagari" | "roman";

export interface TranscriptSegment {
  id: string;
  segmentIndex: number;
  startTime: number; // in seconds
  endTime: number; // in seconds
  textDevanagari: string;
  textRoman: string;
  speakerLabel?: string;
  confidence?: number;
}

export interface Transcript {
  id: string;
  lectureId: string;
  availableScripts: ScriptMode[];
  segments: TranscriptSegment[];
}
