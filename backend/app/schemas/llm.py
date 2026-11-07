from typing import Optional, Any
from pydantic import BaseModel, Field


# --- Segment Reference & Classification ---

class TimeRange(BaseModel):
    start: float
    end: float


class SegmentClassificationItem(BaseModel):
    segment_id: str
    segment_type: str = Field(description="'concept', 'example', 'admin', or 'off_topic'")


# --- Learning Material Extraction Sub-Models ---

class NoteSection(BaseModel):
    heading: str
    bullet_points: list[str]
    referenced_segment_ids: list[str] = Field(default_factory=list)
    referenced_time_ranges: list[TimeRange] = Field(default_factory=list)


class KeyConcept(BaseModel):
    concept: str
    explanation: str
    referenced_segment_ids: list[str] = Field(default_factory=list)
    referenced_time_ranges: list[TimeRange] = Field(default_factory=list)


class GlossaryTerm(BaseModel):
    term: str
    definition: str
    referenced_time_ranges: list[TimeRange] = Field(default_factory=list)


class ImportantQuestion(BaseModel):
    question: str
    suggested_answer: str
    referenced_time_ranges: list[TimeRange] = Field(default_factory=list)


class AnnouncementItem(BaseModel):
    text: str
    referenced_time_ranges: list[TimeRange] = Field(default_factory=list)


class LectureSummary(BaseModel):
    short: str = Field(description="2-3 sentence executive summary")
    detailed: str = Field(description="Comprehensive multi-paragraph synthesis")


# --- Combined Extraction Schema (LLM Response) ---

class CombinedExtractionResult(BaseModel):
    segment_classifications: list[SegmentClassificationItem]
    summary: LectureSummary
    notes: list[NoteSection]
    key_concepts: list[KeyConcept]
    glossary: list[GlossaryTerm]
    important_questions: list[ImportantQuestion]
    announcements: list[AnnouncementItem] = Field(default_factory=list)


# --- Full Learning Material Payload with Attribution & Metadata ---

class TokenUsage(BaseModel):
    prompt_tokens: int = 0
    completion_tokens: int = 0
    total_tokens: int = 0
    estimated_cost_usd: float = 0.0


class LearningMaterialsPayload(BaseModel):
    lecture_id: str
    is_ai_generated: bool = True
    disclaimer: str = (
        "This content is AI-generated from the lecture audio transcript. "
        "It reflects synthesized study material and is never a teacher quote."
    )
    prompt_version: str
    model_name: str
    cache_hit: bool = False
    token_usage: TokenUsage
    summary: LectureSummary
    notes: list[NoteSection]
    key_concepts: list[KeyConcept]
    glossary: list[GlossaryTerm]
    important_questions: list[ImportantQuestion]
    announcements: list[AnnouncementItem]


# --- On-Demand Quiz Schema ---

class QuizQuestion(BaseModel):
    id: str
    question: str
    options: list[str] = Field(description="Exactly 4 choices")
    correct_option_index: int = Field(ge=0, le=3)
    explanation: str
    referenced_segment_ids: list[str] = Field(default_factory=list)
    referenced_time_ranges: list[TimeRange] = Field(default_factory=list)


class QuizGenerationResult(BaseModel):
    questions: list[QuizQuestion]


class QuizPayload(BaseModel):
    lecture_id: str
    is_ai_generated: bool = True
    disclaimer: str = (
        "This quiz is AI-generated from the lecture audio transcript. "
        "It reflects synthesized assessment items and is never a teacher quote."
    )
    model_name: str
    token_usage: TokenUsage
    questions: list[QuizQuestion]

