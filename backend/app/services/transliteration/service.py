"""
Transliteration service comparing deterministic lexicon-based transliteration
and direct Gnani STT transliteration (for <= 30s clips supported by REST).
"""

from typing import Dict, Any, Optional, List, TYPE_CHECKING
from pydantic import BaseModel, Field

from backend.app.services.transliteration.deterministic import DeterministicTransliterator
from backend.app.services.transliteration.lexicon import (
    DEFAULT_TECHNICAL_LEXICON,
    DEFAULT_PRESERVED_ENGLISH_TERMS,
)

if TYPE_CHECKING:
    from backend.app.services.gnani_provider import GnaniSTTProvider


class TransliterationComparisonResult(BaseModel):
    sample_id: str
    input_devanagari_codemix: str
    approach_1_deterministic: str
    approach_2_gnani_direct: Optional[str] = None
    gnani_supported: bool = True
    gnani_note: Optional[str] = None


class TransliterationService:
    """
    Coordinates Roman Hinglish transliteration for lecture transcripts.
    Supports:
    - Deterministic approach (Configurable technical lexicon + Indic-transliteration + Hinglish phonetic post-processor).
    - Direct Gnani REST transliteration (format="transliterate" on audio <= 30s).
    - Side-by-side comparison across sample transcripts.
    """

    def __init__(
        self,
        custom_lexicon: Optional[Dict[str, str]] = None,
        stt_provider: Optional[Any] = None,
    ):
        self.deterministic = DeterministicTransliterator(custom_lexicon=custom_lexicon)
        self._stt_provider = stt_provider

    @property
    def stt_provider(self) -> Any:
        if self._stt_provider is None:
            from backend.app.services.gnani_provider import GnaniSTTProvider
            self._stt_provider = GnaniSTTProvider()
        return self._stt_provider

    def transliterate_text(self, text: str) -> str:
        """
        Deterministic transliteration of Devanagari codemix text to readable Roman Hinglish.
        Guarantees preservation of English technical terms (recursion, stack overflow, API, etc.).
        """
        return self.deterministic.transliterate(text)

    def transliterate_segments(self, segments: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Transliterates a list of segment dicts [{'id': ..., 'text': ..., 'start_time': ..., 'end_time': ...}]
        returning updated segments with Roman text.
        """
        roman_segments = []
        for seg in segments:
            seg_copy = dict(seg)
            seg_copy["text"] = self.deterministic.transliterate(seg.get("text", ""))
            roman_segments.append(seg_copy)
        return roman_segments

    async def compare_approaches_on_audio_sample(
        self,
        sample_id: str,
        audio_bytes: bytes,
        filename: str,
        duration_seconds: float,
        devanagari_codemix_text: str,
    ) -> TransliterationComparisonResult:
        """
        Runs both Approach 1 (Deterministic Lexicon + Transliterator) and
        Approach 2 (Gnani Direct REST with format="transliterate" if <= 30s)
        on a real audio sample.
        """
        # Approach 1: Deterministic
        appr1_output = self.deterministic.transliterate(devanagari_codemix_text)

        # Approach 2: Gnani direct Roman if supported
        appr2_output: Optional[str] = None
        gnani_supported = duration_seconds <= 30.0
        gnani_note: Optional[str] = None

        if gnani_supported:
            try:
                # Gnani REST call with format="transliterate"
                url = f"{self.stt_provider.base_url}/stt/v3"
                files = {"audio_file": (filename, audio_bytes, "audio/wav")}
                data = {
                    "model": "prisma-v3.0",
                    "language_code": "hi-IN,en-IN",
                    "format": "transliterate",
                }
                import httpx
                async with httpx.AsyncClient(timeout=30.0) as client:
                    resp = await client.post(url, headers=self.stt_provider._get_headers(), files=files, data=data)
                    if resp.status_code == 200:
                        resp_data = resp.json()
                        appr2_output = resp_data.get("transcript", "")
                    else:
                        gnani_note = f"Gnani REST responded with HTTP {resp.status_code}: {resp.text}"
            except Exception as e:
                gnani_note = f"Gnani request error: {str(e)}"
        else:
            gnani_note = (
                f"Gnani Batch STT (>30s clip duration: {duration_seconds:.1f}s) only supports "
                f"'codemix' and 'verbatim', not direct 'transliterate' Roman output (per Phase 0 FEASIBILITY.md §2.5)."
            )

        return TransliterationComparisonResult(
            sample_id=sample_id,
            input_devanagari_codemix=devanagari_codemix_text,
            approach_1_deterministic=appr1_output,
            approach_2_gnani_direct=appr2_output,
            gnani_supported=gnani_supported,
            gnani_note=gnani_note,
        )


# Global singleton
transliteration_service = TransliterationService()
