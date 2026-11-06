import time
import uuid
import httpx
from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field
from indic_transliteration import sanscript

from backend.app.core.config import settings
from backend.app.core.exceptions import AppException
from backend.app.core.logging import logger
from backend.app.services.transliteration import transliteration_service


class NormalisedTranscriptSegment(BaseModel):
    id: str = Field(default_factory=lambda: f"seg_{uuid.uuid4().hex[:8]}")
    start_time: float
    end_time: float
    text: str
    confidence: Optional[float] = None
    speaker: Optional[str] = None


class NormalisedTranscript(BaseModel):
    id: str = Field(default_factory=lambda: f"tr_{uuid.uuid4().hex[:8]}")
    lecture_id: str
    detected_language: str = "hi-IN,en-IN"
    full_text_devanagari: str
    full_text_roman: str
    devanagari_segments: List[NormalisedTranscriptSegment]
    roman_segments: List[NormalisedTranscriptSegment]
    raw_provider_response: Dict[str, Any]


def transliterate_devanagari_to_roman(text: str) -> str:
    """
    Transliterates Devanagari text to readable Roman Hinglish while preserving Latin words
    and keeping technical terminology intact.
    """
    if not text:
        return ""
    return transliteration_service.transliterate_text(text)


class GnaniSTTProvider:
    """
    Adapter client for Gnani STT API.
    Routes short clips (<= GNANI_REST_MAX_DURATION_SECONDS) to REST v3,
    and long audio (> GNANI_REST_MAX_DURATION_SECONDS) to Batch v3.
    """

    def __init__(self, api_key: Optional[str] = None, base_url: Optional[str] = None):
        self.api_key = api_key or settings.GNANI_API_KEY
        self.base_url = (base_url or settings.GNANI_BASE_URL).rstrip("/")

    def _get_headers(self) -> Dict[str, str]:
        return {
            "X-API-Key-ID": self.api_key,
            "Accept": "application/json",
            "User-Agent": "BanoAI-Backend/1.0",
        }

    async def transcribe(
        self,
        audio_bytes: bytes,
        filename: str,
        duration_seconds: float,
        lecture_id: str,
    ) -> NormalisedTranscript:
        """
        Main entry point for STT.
        Selects REST or Batch based on audio duration.
        """
        if duration_seconds <= settings.GNANI_REST_MAX_DURATION_SECONDS:
            logger.info(f"Using Gnani REST STT for lecture {lecture_id} (duration={duration_seconds:.1f}s)")
            raw_response = await self._transcribe_rest(audio_bytes, filename)
        else:
            logger.info(f"Using Gnani Batch STT for lecture {lecture_id} (duration={duration_seconds:.1f}s)")
            raw_response = await self._transcribe_batch(audio_bytes, filename)

        return self._normalise_response(raw_response, lecture_id, duration_seconds)

    async def _transcribe_rest(self, audio_bytes: bytes, filename: str) -> Dict[str, Any]:
        """Calls POST /stt/v3 multipart/form-data."""
        url = f"{self.base_url}/stt/v3"
        files = {
            "audio_file": (filename, audio_bytes, "audio/wav"),
        }
        data = {
            "model": "prisma-v3.0",
            "language_code": "hi-IN,en-IN",
            "format": "codemix",
        }

        async with httpx.AsyncClient(timeout=60.0) as client:
            try:
                resp = await client.post(url, headers=self._get_headers(), data=data, files=files)
                if resp.status_code >= 400:
                    raise AppException(
                        status_code=resp.status_code,
                        message=f"Gnani REST STT error: {resp.text}",
                        code="GNANI_REST_ERROR",
                    )
                return resp.json()
            except httpx.TimeoutException:
                raise AppException(
                    status_code=504,
                    message="Gnani REST STT request timed out",
                    code="PROVIDER_TIMEOUT",
                )
            except httpx.RequestError as e:
                raise AppException(
                    status_code=502,
                    message=f"Network error contacting Gnani STT: {str(e)}",
                    code="PROVIDER_NETWORK_ERROR",
                )

    async def _transcribe_batch(self, audio_bytes: bytes, filename: str) -> Dict[str, Any]:
        """
        Executes Gnani Batch STT workflow:
        1. POST /stt/v3/batch/jobs (create job with audio)
        2. POST /stt/v3/batch/jobs/{job_id}/start
        3. Poll GET /stt/v3/batch/jobs/{job_id} until completed
        4. GET /stt/v3/batch/jobs/{job_id}/files for results
        """
        create_url = f"{self.base_url}/stt/v3/batch/jobs"
        files = {
            "audio_files": (filename, audio_bytes, "audio/wav"),
        }
        config_data = {
            "model": "prisma-v3.0",
            "language_code": "hi-IN,en-IN",
            "format": "codemix",
        }

        async with httpx.AsyncClient(timeout=60.0) as client:
            try:
                # 1. Create job
                resp = await client.post(
                    create_url,
                    headers=self._get_headers(),
                    data={"config": str(config_data)},
                    files=files,
                )
                if resp.status_code >= 400:
                    raise AppException(
                        status_code=resp.status_code,
                        message=f"Gnani Batch Job creation error: {resp.text}",
                        code="GNANI_BATCH_CREATE_ERROR",
                    )
                job_data = resp.json()
                job_id = job_data.get("job_id") or job_data.get("id")
                if not job_id:
                    raise AppException(
                        status_code=502,
                        message="Missing job_id in Gnani Batch creation response",
                        code="GNANI_BATCH_INVALID_RESPONSE",
                    )

                # 2. Start job
                start_url = f"{self.base_url}/stt/v3/batch/jobs/{job_id}/start"
                start_resp = await client.post(start_url, headers=self._get_headers())
                if start_resp.status_code >= 400:
                    raise AppException(
                        status_code=start_resp.status_code,
                        message=f"Gnani Batch Job start error: {start_resp.text}",
                        code="GNANI_BATCH_START_ERROR",
                    )

                # 3. Poll for status
                poll_url = f"{self.base_url}/stt/v3/batch/jobs/{job_id}"
                start_time = time.time()
                while time.time() - start_time < settings.GNANI_BATCH_TIMEOUT_SECONDS:
                    status_resp = await client.get(poll_url, headers=self._get_headers())
                    if status_resp.status_code >= 400:
                        raise AppException(
                            status_code=status_resp.status_code,
                            message=f"Gnani Batch Job poll error: {status_resp.text}",
                            code="GNANI_BATCH_POLL_ERROR",
                        )
                    status_json = status_resp.json()
                    current_status = (status_json.get("status") or "").lower()

                    if current_status in ("completed", "success", "done"):
                        # 4. Fetch results
                        files_url = f"{self.base_url}/stt/v3/batch/jobs/{job_id}/files"
                        files_resp = await client.get(files_url, headers=self._get_headers())
                        result_data = files_resp.json() if files_resp.status_code < 400 else status_json
                        return {
                            "batch_job_id": job_id,
                            "status": current_status,
                            "files_result": result_data,
                            "job_status": status_json,
                        }
                    elif current_status in ("failed", "error"):
                        raise AppException(
                            status_code=502,
                            message=f"Gnani Batch Job failed: {status_json.get('error') or status_json}",
                            code="GNANI_BATCH_JOB_FAILED",
                        )

                    # Sleep before next poll
                    await asyncio.sleep(settings.GNANI_BATCH_POLL_INTERVAL_SECONDS)

                raise AppException(
                    status_code=504,
                    message="Gnani Batch STT processing timed out",
                    code="PROVIDER_TIMEOUT",
                )

            except httpx.TimeoutException:
                raise AppException(
                    status_code=504,
                    message="Gnani Batch STT connection timed out",
                    code="PROVIDER_TIMEOUT",
                )
            except httpx.RequestError as e:
                raise AppException(
                    status_code=502,
                    message=f"Network error contacting Gnani STT: {str(e)}",
                    code="PROVIDER_NETWORK_ERROR",
                )

    def _normalise_response(
        self,
        raw: Dict[str, Any],
        lecture_id: str,
        duration_seconds: float,
    ) -> NormalisedTranscript:
        """
        Parses provider output into the internal schema with both
        devanagari_segments and roman_segments.
        """
        # REST structure or Batch structure
        dev_segments: List[NormalisedTranscriptSegment] = []
        full_text_dev = ""

        if "files_result" in raw:
            # Batch response
            files = raw.get("files_result", [])
            if isinstance(files, dict):
                files = files.get("files") or [files]
            
            combined_texts = []
            for f in files:
                segs = f.get("segments") or f.get("words") or []
                text = f.get("transcript") or f.get("text") or ""
                if text:
                    combined_texts.append(text)
                for s in segs:
                    start_t = float(s.get("start_time") or s.get("start") or 0.0)
                    end_t = float(s.get("end_time") or s.get("end") or start_t + 5.0)
                    seg_text = s.get("text") or s.get("word") or ""
                    dev_segments.append(
                        NormalisedTranscriptSegment(
                            start_time=start_t,
                            end_time=end_t,
                            text=seg_text,
                            confidence=s.get("confidence"),
                        )
                    )
            full_text_dev = " ".join(combined_texts).strip()
        else:
            # REST response
            full_text_dev = raw.get("transcript", "").strip()
            # If segments provided by Gnani REST
            raw_segments = raw.get("segments") or raw.get("words") or []
            if raw_segments:
                for s in raw_segments:
                    dev_segments.append(
                        NormalisedTranscriptSegment(
                            start_time=float(s.get("start_time", 0.0)),
                            end_time=float(s.get("end_time", duration_seconds)),
                            text=s.get("text") or s.get("word") or "",
                            confidence=s.get("confidence"),
                        )
                    )
            elif full_text_dev:
                # Synthetic single segment if no word-level timestamps returned
                dev_segments.append(
                    NormalisedTranscriptSegment(
                        start_time=0.0,
                        end_time=round(duration_seconds, 2),
                        text=full_text_dev,
                        confidence=1.0,
                    )
                )

        # Transliterate to Roman Hinglish for roman_segments
        full_text_roman = transliterate_devanagari_to_roman(full_text_dev)
        roman_segments: List[NormalisedTranscriptSegment] = []
        for d_seg in dev_segments:
            roman_text = transliterate_devanagari_to_roman(d_seg.text)
            roman_segments.append(
                NormalisedTranscriptSegment(
                    id=f"rom_{d_seg.id}",
                    start_time=d_seg.start_time,
                    end_time=d_seg.end_time,
                    text=roman_text,
                    confidence=d_seg.confidence,
                )
            )

        return NormalisedTranscript(
            lecture_id=lecture_id,
            detected_language=raw.get("detected_language_code") or "hi-IN,en-IN",
            full_text_devanagari=full_text_dev,
            full_text_roman=full_text_roman,
            devanagari_segments=dev_segments,
            roman_segments=roman_segments,
            raw_provider_response=raw,
        )


import asyncio

