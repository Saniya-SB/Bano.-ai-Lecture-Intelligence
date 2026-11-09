import enum


class LectureStatus(str, enum.Enum):
    UPLOADED = "uploaded"
    PROCESSING = "processing"
    TRANSCRIBING = "transcribing"
    GENERATING_NOTES = "generating_notes"
    COMPLETED = "completed"
    GENERATION_FAILED = "generation_failed"
    FAILED = "failed"


class LectureSourceType(str, enum.Enum):
    UPLOAD = "upload"
    RECORDING = "recording"
    YOUTUBE = "youtube"


class JobStage(str, enum.Enum):
    UPLOADING = "uploading"
    VALIDATING = "validating"
    PREPARING_AUDIO = "preparing_audio"
    TRANSCRIBING = "transcribing"
    PROCESSING_TRANSCRIPT = "processing_transcript"
    GENERATING_LEARNING_MATERIAL = "generating_learning_material"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


# Allowed state transitions for JobStage
ALLOWED_JOB_STAGE_TRANSITIONS: dict[JobStage, set[JobStage]] = {
    JobStage.UPLOADING: {JobStage.VALIDATING, JobStage.FAILED, JobStage.CANCELLED},
    JobStage.VALIDATING: {JobStage.PREPARING_AUDIO, JobStage.FAILED, JobStage.CANCELLED},
    JobStage.PREPARING_AUDIO: {JobStage.TRANSCRIBING, JobStage.FAILED, JobStage.CANCELLED},
    JobStage.TRANSCRIBING: {JobStage.PROCESSING_TRANSCRIPT, JobStage.FAILED, JobStage.CANCELLED},
    JobStage.PROCESSING_TRANSCRIPT: {JobStage.GENERATING_LEARNING_MATERIAL, JobStage.FAILED, JobStage.CANCELLED},
    JobStage.GENERATING_LEARNING_MATERIAL: {JobStage.COMPLETED, JobStage.FAILED, JobStage.CANCELLED},
    JobStage.COMPLETED: set(),
    JobStage.FAILED: set(),
    JobStage.CANCELLED: set(),
}


def can_transition_job_stage(current: JobStage, next_stage: JobStage) -> bool:
    """Validates if transitioning from current stage to next_stage is permitted."""
    if current == next_stage:
        return True
    return next_stage in ALLOWED_JOB_STAGE_TRANSITIONS.get(current, set())


class TranscriptVersion(str, enum.Enum):
    RAW = "raw"
    NORMALISED = "normalised"
    ROMAN = "roman"
    CORRECTED = "corrected"


class SegmentType(str, enum.Enum):
    CONCEPT = "concept"
    EXAMPLE = "example"
    ADMIN = "admin"
    OFF_TOPIC = "off_topic"


class OutputType(str, enum.Enum):
    SUMMARY_SHORT = "summary_short"
    SUMMARY_DETAILED = "summary_detailed"
    NOTES = "notes"
    KEY_CONCEPTS = "key_concepts"
    GLOSSARY = "glossary"
    QUESTIONS = "questions"
    QUIZ = "quiz"
    ASK_ANSWER = "ask_answer"

