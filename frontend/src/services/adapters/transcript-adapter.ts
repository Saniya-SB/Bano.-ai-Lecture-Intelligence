import { TranscriptDto, TranscriptSegmentDto, SegmentType } from "@/types/api/transcript";
import { Transcript, TranscriptSegment } from "@/types/domain/transcript";

const VALID_SEGMENT_TYPES: Set<SegmentType> = new Set([
  "concept",
  "example",
  "admin",
  "off_topic",
]);

function normalizeSegmentType(type?: string): SegmentType {
  if (type && VALID_SEGMENT_TYPES.has(type as SegmentType)) {
    return type as SegmentType;
  }
  return "concept"; // Default fallback
}

export function mapTranscriptSegmentDtoToDomain(
  dto: TranscriptSegmentDto,
  indexFallback = 0
): TranscriptSegment {
  return {
    id: dto.id,
    segmentIndex: typeof dto.segment_index === "number" ? dto.segment_index : indexFallback,
    startTime: Number(dto.start_time) || 0,
    endTime: Number(dto.end_time) || 0,
    textDevanagari: dto.text_devanagari ?? dto.text ?? "",
    textRoman: dto.text_roman ?? dto.text ?? "",
    segmentType: normalizeSegmentType(dto.segment_type),
    speakerLabel: dto.speaker_label,
    confidence: dto.confidence,
  };
}

export function mapTranscriptDtoToDomain(dto: TranscriptDto): Transcript {
  // If segments array is provided directly (M5 format)
  if (Array.isArray(dto.segments) && dto.segments.length > 0) {
    return {
      id: dto.id,
      lectureId: dto.lecture_id,
      availableScripts: dto.available_scripts || ["devanagari", "roman"],
      segments: dto.segments.map((seg, idx) => mapTranscriptSegmentDtoToDomain(seg, idx)),
    };
  }

  // If split into roman_segments and devanagari_segments (API proposal format)
  const romanSegs = dto.roman_segments || [];
  const devanagariSegs = dto.devanagari_segments || [];
  const count = Math.max(romanSegs.length, devanagariSegs.length);

  const mergedSegments: TranscriptSegment[] = [];
  for (let i = 0; i < count; i++) {
    const r = romanSegs[i];
    const d = devanagariSegs[i];
    const base = r || d;
    if (!base) continue;

    mergedSegments.push({
      id: base.id || `seg_${i}`,
      segmentIndex: i,
      startTime: Number(base.start_time) || 0,
      endTime: Number(base.end_time) || 0,
      textDevanagari: d?.text || d?.text_devanagari || r?.text_devanagari || "",
      textRoman: r?.text || r?.text_roman || d?.text_roman || "",
      segmentType: normalizeSegmentType(base.segment_type || r?.segment_type || d?.segment_type),
      speakerLabel: base.speaker_label,
      confidence: base.confidence,
    });
  }

  return {
    id: dto.id,
    lectureId: dto.lecture_id,
    availableScripts: dto.available_scripts || ["devanagari", "roman"],
    segments: mergedSegments,
  };
}
