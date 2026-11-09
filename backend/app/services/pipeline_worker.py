import os
import uuid
from typing import Optional
from sqlalchemy.orm import Session

from backend.app.core.config import settings
from backend.app.core.exceptions import AppException
from backend.app.core.logging import logger
from backend.app.db.session import SessionLocal
from backend.app.models.entities import TranscriptionJob, Lecture, Transcript, TranscriptSegment
from backend.app.models.enums import JobStage, TranscriptVersion, SegmentType, LectureStatus
from backend.app.services.storage import get_storage_adapter
from backend.app.services.validators import validate_magic_bytes
from backend.app.services.audio_prep import AudioPrepService
from backend.app.services.gnani_provider import GnaniSTTProvider, NormalisedTranscript
from backend.app.services.job_machine import JobStateMachine
from backend.app.services.llm.service import LearningMaterialService


async def process_lecture_pipeline(lecture_id: str, provider: Optional[GnaniSTTProvider] = None):
    """
    Background worker function executed via FastAPI BackgroundTasks.
    Runs the complete job stages sequentially:
    1. VALIDATING (magic bytes, size, integrity)
    2. PREPARING_AUDIO (ffprobe duration, ffmpeg 16kHz mono normalization)
    3. TRANSCRIBING (Gnani REST or Batch STT)
    4. PROCESSING_TRANSCRIPT (save normalised devanagari & roman transcripts)
    5. GENERATING_LEARNING_MATERIAL (placeholder hook for Phase 4)
    6. COMPLETED
    """
    db: Session = SessionLocal()
    stt_provider = provider or GnaniSTTProvider()
    storage = get_storage_adapter()
    job: Optional[TranscriptionJob] = None
    lecture: Optional[Lecture] = None

    try:
        job = db.query(TranscriptionJob).filter(TranscriptionJob.lecture_id == lecture_id).first()
        lecture = db.query(Lecture).filter(Lecture.id == lecture_id).first()

        if not job or not lecture:
            logger.error(f"Cannot process lecture {lecture_id}: job or lecture record missing")
            return


        # STAGE 1: VALIDATING
        JobStateMachine.transition(db, job, JobStage.VALIDATING, progress_percent=10)
        
        if not lecture.audio_storage_path or not storage.exists(lecture.audio_storage_path):
            raise AppException(
                status_code=404,
                message="Audio file is missing from storage",
                code="STORAGE_FILE_MISSING",
            )

        local_file_path = storage.get_local_path(lecture.audio_storage_path)
        file_bytes = storage.read_file(lecture.audio_storage_path)

        # Validate magic bytes
        is_valid_magic, detected_format = validate_magic_bytes(file_bytes[:32])
        if not is_valid_magic:
            raise AppException(
                status_code=400,
                message=f"Uploaded file has invalid magic-byte signature ({detected_format})",
                code="INVALID_FILE_SIGNATURE",
            )

        # STAGE 2: PREPARING_AUDIO
        JobStateMachine.transition(db, job, JobStage.PREPARING_AUDIO, progress_percent=25)

        # Probe duration & audio metadata
        duration_sec, sample_rate, channels = AudioPrepService.probe_media(local_file_path)
        if duration_sec < settings.MIN_UPLOAD_DURATION_SECONDS:
            raise AppException(
                status_code=400,
                message=f"Audio duration ({duration_sec:.1f}s) is shorter than minimum required ({settings.MIN_UPLOAD_DURATION_SECONDS}s)",
                code="DURATION_TOO_SHORT",
            )
        if duration_sec > settings.MAX_UPLOAD_DURATION_SECONDS:
            raise AppException(
                status_code=400,
                message=f"Audio duration ({duration_sec:.1f}s) exceeds maximum limit ({settings.MAX_UPLOAD_DURATION_SECONDS}s)",
                code="DURATION_TOO_LONG",
            )

        lecture.duration_seconds = int(duration_sec)
        db.add(lecture)
        db.commit()

        # Normalize to 16kHz mono WAV for STT
        normalized_output_path = f"{local_file_path}_normalized.wav"
        AudioPrepService.convert_to_standard_wav(local_file_path, normalized_output_path)
        with open(normalized_output_path, "rb") as norm_f:
            normalized_bytes = norm_f.read()

        # STAGE 3: TRANSCRIBING
        JobStateMachine.transition(db, job, JobStage.TRANSCRIBING, progress_percent=50)
        normalised_result: NormalisedTranscript = await stt_provider.transcribe(
            audio_bytes=normalized_bytes,
            filename=f"{lecture.id}.wav",
            duration_seconds=duration_sec,
            lecture_id=lecture.id,
        )

        # STAGE 4: PROCESSING_TRANSCRIPT
        JobStateMachine.transition(db, job, JobStage.PROCESSING_TRANSCRIPT, progress_percent=75)

        # Store raw provider output untouched
        raw_transcript = Transcript(
            id=f"tr_raw_{uuid.uuid4().hex[:8]}",
            lecture_id=lecture.id,
            version_type=TranscriptVersion.RAW.value,
            full_text=str(normalised_result.raw_provider_response),
            language_code=normalised_result.detected_language,
        )
        db.add(raw_transcript)

        # Store normalised Devanagari Hinglish transcript
        dev_transcript = Transcript(
            id=f"tr_dev_{uuid.uuid4().hex[:8]}",
            lecture_id=lecture.id,
            version_type=TranscriptVersion.NORMALISED.value,
            full_text=normalised_result.full_text_devanagari,
            language_code=normalised_result.detected_language,
        )
        db.add(dev_transcript)
        db.flush()

        for idx, seg in enumerate(normalised_result.devanagari_segments):
            seg_entity = TranscriptSegment(
                id=seg.id,
                transcript_id=dev_transcript.id,
                segment_index=idx,
                start_time=seg.start_time,
                end_time=seg.end_time,
                text=seg.text,
                segment_type=SegmentType.CONCEPT.value,
                confidence=seg.confidence,
            )
            db.add(seg_entity)

        # Store Roman Hinglish transcript
        rom_transcript = Transcript(
            id=f"tr_rom_{uuid.uuid4().hex[:8]}",
            lecture_id=lecture.id,
            version_type=TranscriptVersion.ROMAN.value,
            full_text=normalised_result.full_text_roman,
            language_code="hi-Latn",
        )
        db.add(rom_transcript)
        db.flush()

        for idx, seg in enumerate(normalised_result.roman_segments):
            seg_entity = TranscriptSegment(
                id=seg.id,
                transcript_id=rom_transcript.id,
                segment_index=idx,
                start_time=seg.start_time,
                end_time=seg.end_time,
                text=seg.text,
                segment_type=SegmentType.CONCEPT.value,
                confidence=seg.confidence,
            )
            db.add(seg_entity)

        db.commit()

        # STAGE 5: GENERATING_LEARNING_MATERIAL
        JobStateMachine.transition(db, job, JobStage.GENERATING_LEARNING_MATERIAL, progress_percent=90)
        lecture.status = LectureStatus.GENERATING_NOTES.value
        db.add(lecture)
        db.commit()

        try:
            llm_service = LearningMaterialService()
            await llm_service.generate_learning_materials(
                lecture_id=lecture.id,
                user_id=lecture.user_id,
                db=db,
                force_refresh=False,
            )
            lecture.status = LectureStatus.COMPLETED.value
            db.add(lecture)
            db.commit()
            logger.info(f"AI study materials generated successfully for lecture {lecture_id}")
        except Exception as llm_err:
            logger.error(f"AI materials generation failed for lecture {lecture_id}, but transcript is preserved: {llm_err}")
            lecture.status = LectureStatus.GENERATION_FAILED.value
            db.add(lecture)
            db.commit()

        # STAGE 6: COMPLETED
        JobStateMachine.transition(db, job, JobStage.COMPLETED, progress_percent=100)
        logger.info(f"Pipeline completed successfully for lecture {lecture_id}")

        # Cleanup temporary normalized file if exists
        if os.path.exists(normalized_output_path):
            os.remove(normalized_output_path)

    except AppException as ae:
        logger.error(f"Pipeline failed for lecture {lecture_id}: {ae.message} (code={ae.code})")
        if job:
            JobStateMachine.handle_failure(db, job, error_message=ae.message, error_code=ae.code)
    except Exception as ex:
        logger.exception(f"Unhandled error in lecture pipeline for {lecture_id}: {str(ex)}")
        if job:
            JobStateMachine.handle_failure(
                db, job, error_message="An internal error occurred during lecture processing.", error_code="INTERNAL_PROCESSING_ERROR"
            )

    finally:
        db.close()
