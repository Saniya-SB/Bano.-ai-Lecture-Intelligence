import { TranscriptDto, TranscriptSegmentDto } from "@/types/api/transcript";
import { Transcript, TranscriptSegment } from "@/types/domain/transcript";

export function mapTranscriptSegmentDtoToDomain(
  dto: TranscriptSegmentDto
): TranscriptSegment {
  return {
    id: dto.id,
    segmentIndex: dto.segment_index,
    startTime: Number(dto.start_time) || 0,
    endTime: Number(dto.end_time) || 0,
    textDevanagari: dto.text_devanagari || "",
    textRoman: dto.text_roman || "",
    speakerLabel: dto.speaker_label,
    confidence: dto.confidence,
  };
}

export function mapTranscriptDtoToDomain(dto: TranscriptDto): Transcript {
  return {
    id: dto.id,
    lectureId: dto.lecture_id,
    availableScripts: dto.available_scripts || ["devanagari", "roman"],
    segments: (dto.segments || []).map(mapTranscriptSegmentDtoToDomain),
  };
}
