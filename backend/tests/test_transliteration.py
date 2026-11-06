"""
Tests for services/transliteration.

Covers:
- Technical term preservation (Latin + Devanagari phonetic)
- Common Hindi word map (में→mein, है→hai, …)
- ITRANS artifact removal (.d, .D, ~n)
- Doubled-vowel collapse (hogaa→hoga, chotaa→chhota)
- Configurable custom lexicon
- Segment-level transliteration
- Gnani Batch limitation flagging
- Regression tests for known failures
"""

import pytest
from backend.app.services.transliteration import (
    DeterministicTransliterator,
    TransliterationService,
    DEFAULT_TECHNICAL_LEXICON,
)


# ---------------------------------------------------------------------------
# Regression tests for exact failures from Phase 5 review
# ---------------------------------------------------------------------------

class TestRegressions:
    """Regression tests for the specific failures identified in the Phase 5 review."""

    def setup_method(self):
        self.t = DeterministicTransliterator()

    def test_bada_not_ba_dot_daa(self):
        """ba.daa → bada (was: ba.daa with ITRANS artifact)"""
        result = self.t.transliterate("राइट सब-ट्री बड़ा होगा।")
        assert ".d" not in result, f"ITRANS artifact .d found in: {result}"
        assert "bada" in result.lower(), f"Expected 'bada' in: {result}"

    def test_mein_not_men(self):
        """में → mein (was: men)"""
        result = self.t.transliterate("इस tree में हर node है।")
        assert "mein" in result.lower(), f"Expected 'mein' in: {result}"

    def test_hoga_not_hogaa(self):
        """होगा → hoga (was: hogaa with doubled vowel)"""
        result = self.t.transliterate("छोटा होगा")
        assert "hoga" in result.lower(), f"Expected 'hoga' in: {result}"
        assert "hogaa" not in result.lower(), f"Doubled vowel 'hogaa' still present in: {result}"

    def test_chhota_not_chotaa(self):
        """छोटा → chhota (was: chotaa/chotaa)"""
        result = self.t.transliterate("छोटा होगा")
        assert "chhota" in result.lower(), f"Expected 'chhota' in: {result}"

    def test_check_in_lexicon(self):
        """चेक → check (was: chek via raw ITRANS)"""
        result = self.t.transliterate("डेटा चेक करेंगे")
        assert "check" in result.lower(), f"Expected 'check' in: {result}"

    def test_discuss_in_lexicon(self):
        """डिस्कस → discuss"""
        result = self.t.transliterate("आज हम डिस्कस करेंगे")
        assert "discuss" in result.lower(), f"Expected 'discuss' in: {result}"

    def test_lecture_in_lexicon(self):
        """लेक्चर → lecture"""
        result = self.t.transliterate("यह लेक्चर है")
        assert "lecture" in result.lower(), f"Expected 'lecture' in: {result}"

    def test_code_in_lexicon(self):
        """कोड → code"""
        result = self.t.transliterate("यह कोड लिखो")
        assert "code" in result.lower(), f"Expected 'code' in: {result}"

    def test_program_in_lexicon(self):
        """प्रोग्राम → program"""
        result = self.t.transliterate("यह प्रोग्राम चलाओ")
        assert "program" in result.lower(), f"Expected 'program' in: {result}"

    def test_no_itrans_dot_d_artifact(self):
        """No .D or .d artifacts anywhere in output."""
        result = self.t.transliterate("बड़ा बड़ी बड़े")
        assert ".d" not in result.lower(), f"ITRANS artifact found in: {result}"
        assert ".D" not in result, f"ITRANS artifact found in: {result}"

    def test_no_tilde_n_artifact(self):
        """No ~n artifacts in output."""
        result = self.t.transliterate("पहुँचना है")
        assert "~n" not in result, f"ITRANS artifact ~n found in: {result}"


# ---------------------------------------------------------------------------
# Core functionality tests
# ---------------------------------------------------------------------------

class TestDeterministicTransliterator:

    def setup_method(self):
        self.t = DeterministicTransliterator()

    def test_preserves_latin_technical_terms(self):
        """English terms already in Latin script must pass through unchanged."""
        result = self.t.transliterate("आज हम recursion और stack overflow समझेंगे।")
        assert "recursion" in result
        assert "stack overflow" in result

    def test_devanagari_technical_terms_converted(self):
        """Technical terms written in Devanagari phonetics must become English."""
        result = self.t.transliterate("आज हम बाइनरी ट्री और डेटा स्ट्रक्चर्स डिस्कस करेंगे।")
        assert "binary tree" in result
        assert "data structures" in result
        assert "discuss" in result.lower()

    def test_hindi_function_words_natural(self):
        """Common Hindi particles must use natural Hinglish spelling."""
        result = self.t.transliterate("इस में हर नोड का डेटा है।")
        lower = result.lower()
        assert "mein" in lower
        assert "ka" in lower
        assert "hai" in lower

    def test_mixed_sentence_api_server(self):
        """Mixed Devanagari + Latin with API, server, request."""
        result = self.t.transliterate(
            "जब हम API endpoint पर GET request भेजते हैं तो सर्वर JSON payload के साथ response रिटर्न करता है।"
        )
        assert "API endpoint" in result
        assert "GET request" in result
        assert "server" in result
        assert "JSON payload" in result
        assert "return" in result.lower()

    def test_oop_concepts(self):
        """OOP terms in Devanagari phonetics."""
        result = self.t.transliterate(
            "इन्हेरिटेंस और पॉलीमॉर्फिज्म से कोड रीयूजेबिलिटी बढ़ती है।"
        )
        assert "inheritance" in result.lower()
        assert "polymorphism" in result.lower()
        assert "code" in result.lower()

    def test_empty_input(self):
        assert self.t.transliterate("") == ""
        assert self.t.transliterate("   ") == ""
        assert self.t.transliterate(None) == ""


class TestConfigurableLexicon:

    def test_custom_lexicon(self):
        custom = {
            "क्वांटम कंप्यूटिंग": "quantum computing",
            "कुबेरनेट्स": "kubernetes",
        }
        t = DeterministicTransliterator(custom_lexicon=custom)
        result = t.transliterate("यह लेक्चर क्वांटम कंप्यूटिंग और कुबेरनेट्स पर है।")
        assert "quantum computing" in result
        assert "kubernetes" in result


class TestTransliterationService:

    def test_segment_transliteration(self):
        service = TransliterationService()
        raw_segments = [
            {"id": "seg_1", "start_time": 0.0, "end_time": 2.5,
             "text": "आज हम recursion सीखेंगे"},
            {"id": "seg_2", "start_time": 2.5, "end_time": 5.0,
             "text": "स्टैक ओवरफ्लो से बचना है"},
        ]
        roman_segments = service.transliterate_segments(raw_segments)
        assert len(roman_segments) == 2
        assert "recursion" in roman_segments[0]["text"].lower()
        assert "stack overflow" in roman_segments[1]["text"].lower()

    @pytest.mark.asyncio
    async def test_batch_transliterate_unsupported(self):
        """Gnani Batch (>30s) does not support format=transliterate."""
        service = TransliterationService()
        comp = await service.compare_approaches_on_audio_sample(
            sample_id="sample_lecture_long",
            audio_bytes=b"fake_long_audio",
            filename="long.wav",
            duration_seconds=45.0,
            devanagari_codemix_text="आज हम binary search सीखेंगे",
        )
        assert comp.gnani_supported is False
        assert "Batch STT (>30s" in comp.gnani_note
        assert "binary search" in comp.approach_1_deterministic
        assert comp.approach_2_gnani_direct is None
