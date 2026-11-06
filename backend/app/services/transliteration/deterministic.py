"""
Deterministic transliteration engine for Devanagari codemix transcripts to readable Roman Hinglish.

Pipeline:
1. Protect existing Latin words with placeholders.
2. Replace Devanagari technical terms from configurable lexicon → English.
3. Replace common Hindi function words from HINDI_WORD_MAP → natural Roman.
4. Run indic-transliteration (sanscript ITRANS) on remaining Devanagari.
5. Clean ITRANS artifacts, collapse doubled vowels, apply schwa deletion.
6. Restore all placeholders.
"""

import re
from typing import Dict, Optional, Set
from indic_transliteration import sanscript

from backend.app.services.transliteration.lexicon import (
    DEFAULT_TECHNICAL_LEXICON,
    DEFAULT_PRESERVED_ENGLISH_TERMS,
    HINDI_WORD_MAP,
)


class DeterministicTransliterator:
    """
    Translates Devanagari codemix text into clean, human-readable Roman Hinglish
    while keeping technical terminology intact.
    """

    def __init__(
        self,
        custom_lexicon: Optional[Dict[str, str]] = None,
        custom_preserved_terms: Optional[Set[str]] = None,
    ):
        self.lexicon = dict(DEFAULT_TECHNICAL_LEXICON)
        if custom_lexicon:
            self.lexicon.update(custom_lexicon)

        self.hindi_map = dict(HINDI_WORD_MAP)

        self.preserved_terms = set(DEFAULT_PRESERVED_ENGLISH_TERMS)
        if custom_preserved_terms:
            self.preserved_terms.update(custom_preserved_terms)

        # Sort lexicon phrases by descending length so multi-word phrases match first
        self._sorted_lexicon_keys = sorted(
            self.lexicon.keys(), key=lambda k: len(k), reverse=True
        )
        self._sorted_hindi_keys = sorted(
            self.hindi_map.keys(), key=lambda k: len(k), reverse=True
        )

    def _protect_and_replace(self, text: str) -> tuple[str, Dict[str, str]]:
        """
        Phase 1-3: Protect Latin words, replace Devanagari technical terms,
        then replace common Hindi function words.  All get unique __TOKEN_n__ placeholders.
        """
        placeholders: Dict[str, str] = {}
        idx = 0

        def _make_token(value: str) -> str:
            nonlocal idx
            token = f"__TOKEN_{idx}__"
            placeholders[token] = value
            idx += 1
            return f" {token} "

        # 1. Protect existing Latin words/numbers
        def _preserve_latin(match: re.Match) -> str:
            return _make_token(match.group(0))

        text = re.sub(r"[a-zA-Z0-9]+(?:[-_./#+][a-zA-Z0-9]+)*", _preserve_latin, text)

        # 2. Replace Devanagari technical lexicon entries
        for key in self._sorted_lexicon_keys:
            if key in text:
                text = text.replace(key, _make_token(self.lexicon[key]))

        # 3. Replace common Hindi function words
        for key in self._sorted_hindi_keys:
            if key in text:
                text = text.replace(key, _make_token(self.hindi_map[key]))

        return text, placeholders

    @staticmethod
    def _clean_itrans(word: str) -> str:
        """
        Cleans a single ITRANS-output word into natural Hinglish:
        - Remove ITRANS artifacts: .D .d .n ~n .h
        - Lowercase ITRANS capitals (A→aa, I→ee, U→oo, T→t, D→d, N→n, M→n)
        - Collapse doubled vowels at word-end (hogaa→hoga, chalegaa→chalega)
        - Basic schwa deletion for final consonant+a
        """
        w = word

        # Remove ITRANS dot/tilde artifacts  (.D  .d  .n  ~n  .h  .N  .T)
        w = re.sub(r"\.D", "d", w)
        w = re.sub(r"\.d", "d", w)
        w = re.sub(r"\.T", "t", w)
        w = re.sub(r"\.t", "t", w)
        w = re.sub(r"\.N", "n", w)
        w = re.sub(r"\.n", "n", w)
        w = re.sub(r"~n", "n", w)
        w = re.sub(r"\.h", "", w)

        # ITRANS capital→natural Roman
        w = w.replace("aa", "DOUBLE_AA_TEMP")   # protect real 'aa' first
        w = w.replace("A", "aa")
        w = w.replace("DOUBLE_AA_TEMP", "aa")
        w = w.replace("I", "ee")
        w = w.replace("U", "oo")
        w = w.replace("T", "t")
        w = w.replace("D", "d")
        w = w.replace("N", "n")
        w = w.replace("M", "n")
        w = w.replace("RR", "ri")              # .RR vowel

        # Anusvara cleanup
        w = w.replace("eM", "en")
        w = w.replace("EM", "en")
        w = w.replace("aM", "an")

        w = w.lower()

        # Collapse doubled vowels at word end: hogaa→hoga, chalegaa→chalega, hotee→hoti
        w = re.sub(r"aa$", "a", w)
        w = re.sub(r"ee$", "i", w)
        w = re.sub(r"oo$", "u", w)
        w = re.sub(r"ii$", "i", w)

        # Schwa deletion: drop trailing 'a' after a consonant cluster or single consonant
        # when the word is long enough (>3 chars after deletion).
        # e.g. "lephta" → "lephta"→"lepht" (too aggressive), but "karta"→"karta" is fine.
        # We'll drop the trailing 'a' only when preceded by 'ta', 'da', 'na' etc.
        # that are artifacts of ITRANS adding schwa to final consonant.
        # Specific pattern: word ends in consonant+'a' and is > 4 chars
        if len(w) > 4 and re.search(r"[bcdfghjklmnpqrstvwxyz]a$", w):
            w = w[:-1]

        # Clean up any remaining danda
        w = w.replace("|", ".")

        return w

    def _post_process(self, transliterated: str) -> str:
        """
        Token-aware post-processing: clean each non-placeholder word via _clean_itrans.
        """
        words = transliterated.split()
        result = []
        for word in words:
            if re.fullmatch(r"__TOKEN_\d+__", word):
                result.append(word)
            else:
                result.append(self._clean_itrans(word))
        return " ".join(result)

    def transliterate(self, devanagari_codemix_text: str) -> str:
        """
        Main transliteration pipeline:
        1. Protect Latin words, replace tech lexicon, replace Hindi word map.
        2. Transliterate remaining Devanagari via sanscript ITRANS.
        3. Clean ITRANS output.
        4. Restore placeholders.
        5. Sentence-case and punctuation cleanup.
        """
        if not devanagari_codemix_text or not devanagari_codemix_text.strip():
            return ""

        # Step 1: Protection & replacement
        masked_text, placeholders = self._protect_and_replace(devanagari_codemix_text)

        # Step 2: Indic-transliteration (sanscript) on what remains
        transliterated = sanscript.transliterate(
            masked_text,
            sanscript.DEVANAGARI,
            sanscript.ITRANS,
        )

        # Step 3: Clean ITRANS output
        cleaned = self._post_process(transliterated)

        # Step 4: Restore placeholders
        for token, original in placeholders.items():
            cleaned = cleaned.replace(token, original)

        # Step 5: Final cleanup
        cleaned = re.sub(r"\s+([.,?!;:])", r"\1", cleaned)   # space before punct
        cleaned = re.sub(r"\s+", " ", cleaned).strip()

        # Capitalize first char of each sentence
        parts = re.split(r"([.?!]\s+)", cleaned)
        caps = []
        for p in parts:
            if p and p[0].isalpha():
                caps.append(p[0].upper() + p[1:])
            else:
                caps.append(p)
        cleaned = "".join(caps)

        # Ensure first char is capitalized
        if cleaned and cleaned[0].isalpha():
            cleaned = cleaned[0].upper() + cleaned[1:]

        return cleaned
