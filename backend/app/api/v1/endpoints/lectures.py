from datetime import datetime, timezone
from typing import Optional
from fastapi import APIRouter, Depends, Query, status
from fastapi.responses import Response
from sqlalchemy.orm import Session
from sqlalchemy import select

from backend.app.api.deps import get_current_user
from backend.app.core.exceptions import AppException
from backend.app.db.session import get_db
from backend.app.models.entities import Lecture, User, Transcript, TranscriptSegment, GeneratedOutput
from backend.app.models.enums import LectureStatus, TranscriptVersion, OutputType
from backend.app.schemas.lecture import (
    LectureCreate,
    LectureUpdate,
    LectureResponse,
)
from backend.app.schemas.llm import (
    LearningMaterialsPayload,
    TokenUsage,
    QuizPayload,
    AskLectureRequest,
    AskLectureResponse,
)

router = APIRouter(prefix="/lectures", tags=["Lectures"])


def _format_lecture_response(lecture: Lecture) -> dict:
    return {
        "id": lecture.id,
        "title": lecture.title,
        "subject": lecture.subject,
        "topic": lecture.topic,
        "duration_seconds": lecture.duration_seconds,
        "status": lecture.status,
        "is_test_data": getattr(lecture, "is_test_data", False),
        "created_at": lecture.created_at.isoformat() if lecture.created_at else "",
        "updated_at": lecture.updated_at.isoformat() if lecture.updated_at else "",
    }


def _is_test_data_allowed() -> bool:
    """is_test_data can only be set in non-production/dev environments; never in production."""
    from backend.app.core.config import settings
    if settings.ENVIRONMENT == "production":
        return False
    return settings.AUTH_MODE == "dev" or settings.ENVIRONMENT != "production"


@router.post("", response_model=LectureResponse, status_code=status.HTTP_201_CREATED)
def create_lecture(
    payload: LectureCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Create a new lecture. Ownership is enforced via current_user.id.
    is_test_data is only honored in non-production/dev environments; ignored in production.
    """
    import uuid

    # In test/dev environments or when specified by client, allow overriding is_test_data
    is_test = payload.is_test_data if _is_test_data_allowed() else False

    lecture_id = f"lec_{uuid.uuid4().hex[:12]}"
    lecture = Lecture(
        id=lecture_id,
        user_id=current_user.id,
        title=payload.title,
        subject=payload.subject,
        topic=payload.topic,
        duration_seconds=0,
        status=LectureStatus.UPLOADED.value,
        is_test_data=is_test,
    )
    db.add(lecture)
    db.commit()
    db.refresh(lecture)
    return _format_lecture_response(lecture)


@router.get("", response_model=list[LectureResponse])
def list_lectures(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    List all lectures belonging strictly to the authenticated user.
    """
    lectures = db.scalars(
        select(Lecture)
        .where(Lecture.user_id == current_user.id)
        .order_by(Lecture.created_at.desc())
    ).all()
    return [_format_lecture_response(l) for l in lectures]


@router.get("/{lecture_id}", response_model=LectureResponse)
def get_lecture(
    lecture_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Retrieve a single lecture by ID. Ownership enforced (prevents IDOR: returns 404 if not owned).
    """
    lecture = db.scalar(
        select(Lecture).where(
            Lecture.id == lecture_id,
            Lecture.user_id == current_user.id,
        )
    )
    if not lecture:
        raise AppException(
            status_code=status.HTTP_404_NOT_FOUND,
            message=f"Lecture with ID {lecture_id} was not found",
            code="NOT_FOUND",
        )
    return _format_lecture_response(lecture)


@router.patch("/{lecture_id}", response_model=LectureResponse)
def update_lecture(
    lecture_id: str,
    payload: LectureUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Update lecture fields (e.g. title rename, subject, topic).
    Ownership enforced (returns 404 if not owned).
    """
    lecture = db.scalar(
        select(Lecture).where(
            Lecture.id == lecture_id,
            Lecture.user_id == current_user.id,
        )
    )
    if not lecture:
        raise AppException(
            status_code=status.HTTP_404_NOT_FOUND,
            message=f"Lecture with ID {lecture_id} was not found",
            code="NOT_FOUND",
        )

    updates = payload.model_dump(exclude_unset=True)
    if "is_test_data" in updates and not _is_test_data_allowed():
        # Ignore client request to set/flip is_test_data in production
        del updates["is_test_data"]

    for field, val in updates.items():
        setattr(lecture, field, val)

    db.commit()
    db.refresh(lecture)
    return _format_lecture_response(lecture)


@router.delete("/{lecture_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_lecture(
    lecture_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Delete a lecture by ID. Ownership enforced (returns 404 if not owned).
    """
    lecture = db.scalar(
        select(Lecture).where(
            Lecture.id == lecture_id,
            Lecture.user_id == current_user.id,
        )
    )
    if not lecture:
        raise AppException(
            status_code=status.HTTP_404_NOT_FOUND,
            message=f"Lecture with ID {lecture_id} was not found",
            code="NOT_FOUND",
        )

    db.delete(lecture)
    db.commit()
    return None


@router.get("/{lecture_id}/transcripts")
def get_lecture_transcripts(
    lecture_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Retrieves dual Roman and Devanagari transcript segments formatted for frontend TranscriptDto.
    """
    from backend.app.models.entities import Transcript, TranscriptSegment
    from backend.app.models.enums import TranscriptVersion

    # Verify ownership
    lecture = db.scalar(
        select(Lecture).where(
            Lecture.id == lecture_id,
            Lecture.user_id == current_user.id,
        )
    )
    if not lecture:
        raise AppException(
            status_code=status.HTTP_404_NOT_FOUND,
            message=f"Lecture with ID {lecture_id} was not found",
            code="NOT_FOUND",
        )

    # Fetch Devanagari and Roman transcripts
    dev_transcript = db.execute(
        select(Transcript).where(
            Transcript.lecture_id == lecture_id,
            Transcript.version_type == TranscriptVersion.NORMALISED.value,
        )
    ).scalar_one_or_none()

    rom_transcript = db.execute(
        select(Transcript).where(
            Transcript.lecture_id == lecture_id,
            Transcript.version_type == TranscriptVersion.ROMAN.value,
        )
    ).scalar_one_or_none()

    dev_segments = []
    if dev_transcript:
        segments = db.execute(
            select(TranscriptSegment)
            .where(TranscriptSegment.transcript_id == dev_transcript.id)
            .order_by(TranscriptSegment.start_time)
        ).scalars().all()
        dev_segments = [
            {
                "id": s.id,
                "start_time": s.start_time,
                "end_time": s.end_time,
                "text": s.text,
                "segment_type": getattr(s, "segment_type", "concept"),
            }
            for s in segments
        ]

    rom_segments = []
    if rom_transcript:
        segments = db.execute(
            select(TranscriptSegment)
            .where(TranscriptSegment.transcript_id == rom_transcript.id)
            .order_by(TranscriptSegment.start_time)
        ).scalars().all()
        rom_segments = [
            {
                "id": s.id,
                "start_time": s.start_time,
                "end_time": s.end_time,
                "text": s.text,
                "segment_type": getattr(s, "segment_type", "concept"),
            }
            for s in segments
        ]

    return {
        "id": f"tr_{lecture_id}",
        "lecture_id": lecture_id,
        "roman_segments": rom_segments,
        "devanagari_segments": dev_segments,
    }


def _format_time(seconds: float) -> str:
    m = int(seconds // 60)
    s = int(seconds % 60)
    return f"{m:02d}:{s:02d}"


@router.get("/{lecture_id}/export")
def export_lecture(
    lecture_id: str,
    format: str = Query("md", description="Export format, only 'md' is supported"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Exports lecture transcripts, summary, notes, glossary, questions, and announcements in Markdown format.
    Owner-only access strictly enforced (returns 404 if not found or unauthorized).
    Only format=md is supported.
    """
    if format.lower() != "md":
        raise AppException(
            status_code=status.HTTP_400_BAD_REQUEST,
            message="Only 'md' export format is supported",
            code="UNSUPPORTED_EXPORT_FORMAT",
        )

    # 1. Enforce ownership (IDOR prevention)
    lecture = db.scalar(
        select(Lecture).where(
            Lecture.id == lecture_id,
            Lecture.user_id == current_user.id,
        )
    )
    if not lecture:
        raise AppException(
            status_code=status.HTTP_404_NOT_FOUND,
            message=f"Lecture with ID {lecture_id} was not found",
            code="NOT_FOUND",
        )

    # 2. Fetch Devanagari and Roman transcripts & segments
    dev_transcript = db.scalar(
        select(Transcript).where(
            Transcript.lecture_id == lecture_id,
            Transcript.version_type == TranscriptVersion.NORMALISED.value,
        )
    )
    dev_segments = []
    if dev_transcript:
        dev_segments = db.scalars(
            select(TranscriptSegment)
            .where(TranscriptSegment.transcript_id == dev_transcript.id)
            .order_by(TranscriptSegment.start_time)
        ).all()

    rom_transcript = db.scalar(
        select(Transcript).where(
            Transcript.lecture_id == lecture_id,
            Transcript.version_type == TranscriptVersion.ROMAN.value,
        )
    )
    rom_segments = []
    if rom_transcript:
        rom_segments = db.scalars(
            select(TranscriptSegment)
            .where(TranscriptSegment.transcript_id == rom_transcript.id)
            .order_by(TranscriptSegment.start_time)
        ).all()

    # 3. Fetch AI Generated Output (learning materials)
    output_record = db.scalar(
        select(GeneratedOutput)
        .where(
            GeneratedOutput.lecture_id == lecture_id,
            GeneratedOutput.user_id == current_user.id,
        )
        .order_by(GeneratedOutput.created_at.desc())
    )
    materials = output_record.content if output_record else {}

    # 4. Construct Markdown
    md_lines: list[str] = []
    md_lines.append(f"# {lecture.title}")
    md_lines.append("")
    md_lines.append(f"- **Subject**: {lecture.subject}")
    md_lines.append(f"- **Topic**: {lecture.topic or 'N/A'}")
    duration_str = f"{_format_time(lecture.duration_seconds)} ({lecture.duration_seconds}s)"
    md_lines.append(f"- **Duration**: {duration_str}")
    md_lines.append(f"- **Status**: {lecture.status}")
    md_lines.append(f"- **Exported At**: {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M:%S UTC')}")
    md_lines.append("")
    md_lines.append("---")
    md_lines.append("")

    # AI-Generated Sections (Clearly labelled)
    md_lines.append("## AI-Generated Study Materials")
    md_lines.append("> [!NOTE]")
    md_lines.append("> **AI-Generated Content Notice**: The summary, notes, key concepts, glossary, questions, and announcements below were synthesized by AI from the lecture audio transcript. They are study aids and not verbatim teacher quotes.")
    md_lines.append("")

    # Summary
    summary = materials.get("summary") or {}
    short_summary = summary.get("short") or ""
    detailed_summary = summary.get("detailed") or ""
    md_lines.append("### Summary (AI-Generated)")
    if short_summary:
        md_lines.append("#### Executive Summary")
        md_lines.append(short_summary)
        md_lines.append("")
    if detailed_summary:
        md_lines.append("#### Detailed Synthesis")
        md_lines.append(detailed_summary)
        md_lines.append("")
    if not short_summary and not detailed_summary:
        md_lines.append("*(No summary generated yet)*")
        md_lines.append("")

    # Notes
    notes = materials.get("notes") or []
    md_lines.append("### Notes & Principles (AI-Generated)")
    if notes:
        for n in notes:
            heading = n.get("heading") or "Note"
            md_lines.append(f"#### {heading}")
            for bp in n.get("bullet_points") or []:
                md_lines.append(f"- {bp}")
            md_lines.append("")
    else:
        md_lines.append("*(No notes generated yet)*")
        md_lines.append("")

    # Key Concepts
    key_concepts = materials.get("key_concepts") or []
    if key_concepts:
        md_lines.append("### Key Concepts (AI-Generated)")
        for kc in key_concepts:
            concept = kc.get("concept") or ""
            explanation = kc.get("explanation") or ""
            md_lines.append(f"- **{concept}**: {explanation}")
        md_lines.append("")

    # Glossary
    glossary = materials.get("glossary") or []
    md_lines.append("### Glossary (AI-Generated)")
    if glossary:
        for g in glossary:
            term = g.get("term") or ""
            defn = g.get("definition") or ""
            md_lines.append(f"- **{term}**: {defn}")
        md_lines.append("")
    else:
        md_lines.append("*(No glossary entries generated yet)*")
        md_lines.append("")

    # Important Questions
    important_questions = materials.get("important_questions") or []
    md_lines.append("### Important Questions & Practice (AI-Generated)")
    if important_questions:
        for idx, q in enumerate(important_questions, 1):
            q_text = q.get("question") or ""
            ans_text = q.get("suggested_answer") or ""
            md_lines.append(f"#### Q{idx}: {q_text}")
            md_lines.append(f"**Answer**: {ans_text}")
            md_lines.append("")
    else:
        md_lines.append("*(No questions generated yet)*")
        md_lines.append("")

    # Announcements
    announcements = materials.get("announcements") or []
    md_lines.append("### Announcements & Admin Items (AI-Generated)")
    if announcements:
        for a in announcements:
            text = a.get("text") or ""
            md_lines.append(f"- {text}")
        md_lines.append("")
    else:
        md_lines.append("*(No administrative announcements detected)*")
        md_lines.append("")

    md_lines.append("---")
    md_lines.append("")

    # Transcripts Section
    md_lines.append("## Lecture Transcripts")
    md_lines.append("")

    # Devanagari Transcript
    md_lines.append("### Devanagari Transcript (Original Hindi / Hinglish)")
    if dev_segments:
        for s in dev_segments:
            seg_tag = f"[{s.segment_type.upper()}]" if getattr(s, "segment_type", None) else ""
            md_lines.append(f"`[{_format_time(s.start_time)} - {_format_time(s.end_time)}]` {seg_tag} {s.text}")
        md_lines.append("")
    elif dev_transcript and dev_transcript.full_text:
        md_lines.append(dev_transcript.full_text)
        md_lines.append("")
    else:
        md_lines.append("*(Devanagari transcript not available)*")
        md_lines.append("")

    # Romanized Transcript
    md_lines.append("### Romanized Transcript (Hinglish / Latin Script)")
    if rom_segments:
        for s in rom_segments:
            seg_tag = f"[{s.segment_type.upper()}]" if getattr(s, "segment_type", None) else ""
            md_lines.append(f"`[{_format_time(s.start_time)} - {_format_time(s.end_time)}]` {seg_tag} {s.text}")
        md_lines.append("")
    elif rom_transcript and rom_transcript.full_text:
        md_lines.append(rom_transcript.full_text)
        md_lines.append("")
    else:
        md_lines.append("*(Romanized transcript not available)*")
        md_lines.append("")

    export_content = "\n".join(md_lines)
    safe_title = "".join(c if c.isalnum() or c in ("-", "_") else "_" for c in lecture.title.lower())[:40]
    return Response(
        content=export_content,
        media_type="text/markdown; charset=utf-8",
        headers={
            "Content-Disposition": f'attachment; filename="{safe_title}_export.md"'
        },
    )


@router.get("/{lecture_id}/materials", response_model=LearningMaterialsPayload)
@router.get("/{lecture_id}/outputs", response_model=LearningMaterialsPayload)
def get_lecture_materials(
    lecture_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Retrieves synthesized learning materials (notes, summary, key concepts, glossary, questions, announcements).
    Owner-only access strictly enforced (prevents IDOR: returns 404 if not owned).
    """
    lecture = db.scalar(
        select(Lecture).where(
            Lecture.id == lecture_id,
            Lecture.user_id == current_user.id,
        )
    )
    if not lecture:
        raise AppException(
            status_code=status.HTTP_404_NOT_FOUND,
            message=f"Lecture with ID {lecture_id} was not found",
            code="NOT_FOUND",
        )

    output_record = db.scalar(
        select(GeneratedOutput)
        .where(
            GeneratedOutput.lecture_id == lecture_id,
            GeneratedOutput.user_id == current_user.id,
        )
        .order_by(GeneratedOutput.created_at.desc())
    )
    if not output_record or not output_record.content:
        raise AppException(
            status_code=status.HTTP_404_NOT_FOUND,
            message=f"Learning materials for lecture {lecture_id} were not found",
            code="MATERIALS_NOT_FOUND",
        )

    content = output_record.content
    token_usage_dict = output_record.token_usage or {}
    return LearningMaterialsPayload(
        lecture_id=lecture_id,
        is_ai_generated=True,
        prompt_version=output_record.prompt_version,
        model_name=output_record.model_name,
        cache_hit=True,
        token_usage=TokenUsage(**token_usage_dict),
        summary=content.get("summary", {"short": "", "detailed": ""}),
        notes=content.get("notes", []),
        key_concepts=content.get("key_concepts", []),
        glossary=content.get("glossary", []),
        important_questions=content.get("important_questions", []),
        announcements=content.get("announcements", []),
    )


@router.get("/{lecture_id}/quiz", response_model=QuizPayload)
def get_lecture_quiz(
    lecture_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Fetches the existing generated quiz for a lecture.
    Owner-only access strictly enforced (prevents IDOR: returns 404 if not owned).
    """
    lecture = db.scalar(
        select(Lecture).where(
            Lecture.id == lecture_id,
            Lecture.user_id == current_user.id,
        )
    )
    if not lecture:
        raise AppException(
            status_code=status.HTTP_404_NOT_FOUND,
            message=f"Lecture with ID {lecture_id} was not found",
            code="NOT_FOUND",
        )

    quiz_record = db.scalar(
        select(GeneratedOutput)
        .where(
            GeneratedOutput.lecture_id == lecture_id,
            GeneratedOutput.user_id == current_user.id,
            GeneratedOutput.output_type == OutputType.QUIZ.value,
        )
        .order_by(GeneratedOutput.created_at.desc())
    )
    if not quiz_record or not quiz_record.content:
        raise AppException(
            status_code=status.HTTP_404_NOT_FOUND,
            message=f"Quiz for lecture {lecture_id} was not found",
            code="QUIZ_NOT_FOUND",
        )

    content = quiz_record.content
    token_usage_dict = quiz_record.token_usage or {}
    return QuizPayload(
        lecture_id=lecture_id,
        is_ai_generated=True,
        model_name=quiz_record.model_name,
        token_usage=TokenUsage(**token_usage_dict),
        questions=content.get("questions", []),
    )


@router.post("/{lecture_id}/quiz", response_model=QuizPayload)
async def generate_lecture_quiz(
    lecture_id: str,
    num_questions: int = Query(5, ge=1, le=15),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Generates a new on-demand multiple-choice quiz for the lecture.
    Owner-only access strictly enforced (prevents IDOR: returns 404 if not owned).
    """
    from backend.app.services.llm.service import LearningMaterialService

    lecture = db.scalar(
        select(Lecture).where(
            Lecture.id == lecture_id,
            Lecture.user_id == current_user.id,
        )
    )
    if not lecture:
        raise AppException(
            status_code=status.HTTP_404_NOT_FOUND,
            message=f"Lecture with ID {lecture_id} was not found",
            code="NOT_FOUND",
        )

    service = LearningMaterialService()
    return await service.generate_quiz(
        lecture_id=lecture_id,
        user_id=current_user.id,
        db=db,
        num_questions=num_questions,
    )


@router.post("/{lecture_id}/generate", response_model=LearningMaterialsPayload)
async def generate_lecture_materials(
    lecture_id: str,
    force_refresh: bool = Query(False, description="Force regeneration bypassing cache"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Triggers or retries generation of AI study materials without re-transcribing audio.
    Owner-only access strictly enforced (prevents IDOR: returns 404 if not owned).
    """
    from backend.app.services.llm.service import LearningMaterialService

    lecture = db.scalar(
        select(Lecture).where(
            Lecture.id == lecture_id,
            Lecture.user_id == current_user.id,
        )
    )
    if not lecture:
        raise AppException(
            status_code=status.HTTP_404_NOT_FOUND,
            message=f"Lecture with ID {lecture_id} was not found",
            code="NOT_FOUND",
        )

    # Check transcript exists
    transcript = db.execute(
        select(Transcript).where(Transcript.lecture_id == lecture_id)
    ).scalars().first()
    if not transcript:
        raise AppException(
            status_code=status.HTTP_400_BAD_REQUEST,
            message="Cannot generate study materials: transcript is missing",
            code="TRANSCRIPT_MISSING",
        )

    lecture.status = LectureStatus.GENERATING_NOTES.value
    db.add(lecture)
    db.commit()

    service = LearningMaterialService()
    try:
        materials = await service.generate_learning_materials(
            lecture_id=lecture_id,
            user_id=current_user.id,
            db=db,
            force_refresh=force_refresh,
        )
        lecture.status = LectureStatus.COMPLETED.value
        db.add(lecture)
        db.commit()
        return materials
    except Exception as e:
        lecture.status = LectureStatus.GENERATION_FAILED.value
        db.add(lecture)
        db.commit()
        raise e


@router.get("/{lecture_id}/export/notes")
def export_lecture_notes(
    lecture_id: str,
    format: str = Query("pdf", description="Export format, only 'pdf' is supported"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Exports AI-generated English notes as a PDF.
    Owner-only access strictly enforced (prevents IDOR: returns 404 if not owned).
    Returns 400 Bad Request if format is not 'pdf' or if notes are not ready.
    """
    from backend.app.services.pdf_export import generate_notes_pdf

    if format.lower() != "pdf":
        raise AppException(
            status_code=status.HTTP_400_BAD_REQUEST,
            message="Only 'pdf' format is supported for notes export",
            code="UNSUPPORTED_EXPORT_FORMAT",
        )

    lecture = db.scalar(
        select(Lecture).where(
            Lecture.id == lecture_id,
            Lecture.user_id == current_user.id,
        )
    )
    if not lecture:
        raise AppException(
            status_code=status.HTTP_404_NOT_FOUND,
            message=f"Lecture with ID {lecture_id} was not found",
            code="NOT_FOUND",
        )

    # Fetch generated notes output
    output_record = db.scalar(
        select(GeneratedOutput)
        .where(
            GeneratedOutput.lecture_id == lecture_id,
            GeneratedOutput.user_id == current_user.id,
        )
        .order_by(GeneratedOutput.created_at.desc())
    )

    if not output_record or not output_record.content:
        raise AppException(
            status_code=status.HTTP_400_BAD_REQUEST,
            message="Notes are not ready for export yet. Please wait for processing to complete.",
            code="NOTES_NOT_READY",
        )

    notes = output_record.content.get("notes") or []
    if not notes:
        raise AppException(
            status_code=status.HTTP_400_BAD_REQUEST,
            message="No structured notes found for this lecture.",
            code="NOTES_NOT_READY",
        )

    pdf_bytes = generate_notes_pdf(
        lecture_title=lecture.title,
        lecture_subject=lecture.subject,
        notes=notes,
    )

    safe_title = "".join(c if c.isalnum() or c in ("-", "_") else "_" for c in lecture.title.lower())[:40] or "lecture"
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="{safe_title}_notes.pdf"'
        },
    )


@router.post("/{lecture_id}/ask", response_model=AskLectureResponse)
async def ask_lecture(
    lecture_id: str,
    payload: AskLectureRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Ask this lecture a question (English, Hindi, or Hinglish).
    Owner-only access strictly enforced (prevents IDOR: returns 404 if not owned).
    Answers strictly grounded in top retrieved transcript segments without exposing timestamps.
    """
    from backend.app.services.ask_service import AskLectureService

    service = AskLectureService()
    return await service.ask_question(
        lecture_id=lecture_id,
        question=payload.question,
        user_id=current_user.id,
        db=db,
    )




