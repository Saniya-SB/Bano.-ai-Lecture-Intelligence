/**
 * Domain models for Learning Materials & Quizzes.
 * CamelCase convention for frontend usage.
 */

export interface TimeRange {
  start: number;
  end: number;
}

export interface NoteItem {
  heading: string;
  bulletPoints: string[];
  referencedSegmentIds?: string[];
  referencedTimeRanges?: TimeRange[];
}

export interface KeyConcept {
  concept: string;
  explanation: string;
  referencedSegmentIds?: string[];
  referencedTimeRanges?: TimeRange[];
}

export interface GlossaryItem {
  term: string;
  definition: string;
  referencedTimeRanges?: TimeRange[];
}

export interface ImportantQuestion {
  question: string;
  suggestedAnswer: string;
  referencedTimeRanges?: TimeRange[];
}

export interface Announcement {
  text: string;
  referencedTimeRanges?: TimeRange[];
}

export interface LearningMaterials {
  lectureId: string;
  isAiGenerated: boolean;
  disclaimer: string;
  promptVersion?: string;
  modelName?: string;
  cacheHit?: boolean;
  summary: {
    short: string;
    detailed: string;
  };
  notes: NoteItem[];
  keyConcepts: KeyConcept[];
  glossary: GlossaryItem[];
  importantQuestions: ImportantQuestion[];
  announcements?: Announcement[];
}

export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctOptionIndex: number;
  explanation?: string;
  referencedSegmentIds?: string[];
  referencedTimeRanges?: TimeRange[];
}

export interface Quiz {
  lectureId: string;
  isAiGenerated: boolean;
  disclaimer: string;
  questions: QuizQuestion[];
}
