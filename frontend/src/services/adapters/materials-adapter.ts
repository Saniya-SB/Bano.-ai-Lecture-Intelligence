import {
  LearningMaterialsDto,
  QuizDto,
  TimeRangeDto,
  NoteItemDto,
  KeyConceptDto,
  GlossaryItemDto,
  ImportantQuestionDto,
  QuizQuestionDto,
  AnnouncementDto,
} from "@/types/api/materials";
import {
  LearningMaterials,
  Quiz,
  TimeRange,
  NoteItem,
  KeyConcept,
  GlossaryItem,
  ImportantQuestion,
  QuizQuestion,
  Announcement,
} from "@/types/domain/materials";

export function mapTimeRangeDtoToDomain(dto: TimeRangeDto): TimeRange {
  return {
    start: Number(dto.start) || 0,
    end: Number(dto.end) || 0,
  };
}

export function mapNoteItemDtoToDomain(dto: NoteItemDto): NoteItem {
  return {
    heading: dto.heading || "Untitled Note",
    bulletPoints: Array.isArray(dto.bullet_points) ? dto.bullet_points : [],
    referencedSegmentIds: dto.referenced_segment_ids,
    referencedTimeRanges: dto.referenced_time_ranges?.map(mapTimeRangeDtoToDomain),
  };
}

export function mapKeyConceptDtoToDomain(dto: KeyConceptDto): KeyConcept {
  return {
    concept: dto.concept || "Concept",
    explanation: dto.explanation || "",
    referencedSegmentIds: dto.referenced_segment_ids,
    referencedTimeRanges: dto.referenced_time_ranges?.map(mapTimeRangeDtoToDomain),
  };
}

export function mapGlossaryItemDtoToDomain(dto: GlossaryItemDto): GlossaryItem {
  return {
    term: dto.term || "",
    definition: dto.definition || "",
    referencedTimeRanges: dto.referenced_time_ranges?.map(mapTimeRangeDtoToDomain),
  };
}

export function mapImportantQuestionDtoToDomain(
  dto: ImportantQuestionDto
): ImportantQuestion {
  return {
    question: dto.question || "",
    suggestedAnswer: dto.suggested_answer || "",
    referencedTimeRanges: dto.referenced_time_ranges?.map(mapTimeRangeDtoToDomain),
  };
}

export function mapAnnouncementDtoToDomain(dto: AnnouncementDto): Announcement {
  return {
    text: dto.text || "",
    referencedTimeRanges: dto.referenced_time_ranges?.map(mapTimeRangeDtoToDomain),
  };
}

export function mapLearningMaterialsDtoToDomain(
  dto: LearningMaterialsDto
): LearningMaterials {
  return {
    lectureId: dto.lecture_id,
    isAiGenerated: Boolean(dto.is_ai_generated),
    disclaimer:
      dto.disclaimer ||
      "This content is AI-generated from the lecture audio transcript. It reflects synthesized study material and is never a teacher quote.",
    promptVersion: dto.prompt_version,
    modelName: dto.model_name,
    cacheHit: dto.cache_hit,
    summary: {
      short: dto.summary?.short || "",
      detailed: dto.summary?.detailed || "",
    },
    notes: (dto.notes || []).map(mapNoteItemDtoToDomain),
    keyConcepts: (dto.key_concepts || []).map(mapKeyConceptDtoToDomain),
    glossary: (dto.glossary || []).map(mapGlossaryItemDtoToDomain),
    importantQuestions: (dto.important_questions || []).map(
      mapImportantQuestionDtoToDomain
    ),
    announcements: dto.announcements?.map(mapAnnouncementDtoToDomain),
  };
}

export function mapQuizQuestionDtoToDomain(dto: QuizQuestionDto): QuizQuestion {
  return {
    id: dto.id,
    question: dto.question || "",
    options: Array.isArray(dto.options) ? dto.options : [],
    correctOptionIndex: typeof dto.correct_option_index === "number" ? dto.correct_option_index : 0,
    explanation: dto.explanation,
    referencedSegmentIds: dto.referenced_segment_ids,
    referencedTimeRanges: dto.referenced_time_ranges?.map(mapTimeRangeDtoToDomain),
  };
}

export function mapQuizDtoToDomain(dto: QuizDto): Quiz {
  return {
    lectureId: dto.lecture_id,
    isAiGenerated: Boolean(dto.is_ai_generated),
    disclaimer:
      dto.disclaimer ||
      "This quiz is AI-generated from the lecture audio transcript.",
    questions: (dto.questions || []).map(mapQuizQuestionDtoToDomain),
  };
}
