/**
 * Types based on docs/API_PROPOSAL.md
 * Field names follow backend snake_case convention.
 */

export interface TimeRangeDto {
  start: number;
  end: number;
}

export interface NoteItemDto {
  heading: string;
  bullet_points: string[];
  referenced_segment_ids?: string[];
  referenced_time_ranges?: TimeRangeDto[];
}

export interface KeyConceptDto {
  concept: string;
  explanation: string;
  referenced_segment_ids?: string[];
  referenced_time_ranges?: TimeRangeDto[];
}

export interface GlossaryItemDto {
  term: string;
  definition: string;
  referenced_time_ranges?: TimeRangeDto[];
}

export interface ImportantQuestionDto {
  question: string;
  suggested_answer: string;
  referenced_time_ranges?: TimeRangeDto[];
}

export interface AnnouncementDto {
  text: string;
  referenced_time_ranges?: TimeRangeDto[];
}

export interface LearningMaterialsDto {
  lecture_id: string;
  is_ai_generated: boolean;
  disclaimer?: string;
  prompt_version?: string;
  model_name?: string;
  cache_hit?: boolean;
  summary: {
    short: string;
    detailed: string;
  };
  notes: NoteItemDto[];
  key_concepts: KeyConceptDto[];
  glossary: GlossaryItemDto[];
  important_questions: ImportantQuestionDto[];
  announcements?: AnnouncementDto[];
}

export interface QuizQuestionDto {
  id: string;
  question: string;
  options: string[];
  correct_option_index: number;
  explanation?: string;
  referenced_segment_ids?: string[];
  referenced_time_ranges?: TimeRangeDto[];
}

export interface QuizDto {
  lecture_id: string;
  is_ai_generated: boolean;
  disclaimer?: string;
  questions: QuizQuestionDto[];
}
