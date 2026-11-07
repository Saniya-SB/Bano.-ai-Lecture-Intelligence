import os
import csv
import string
import unicodedata
from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field


# Devanagari punctuation (Purna Viram, Deergh Viram, quotation marks, dashes)
DEVANAGARI_PUNCTUATION = "।॥“”‘’«»…–—"
ALL_PUNCTUATION_SET = set(string.punctuation + DEVANAGARI_PUNCTUATION)


class BenchmarkClip(BaseModel):
    clip_id: str
    source: str
    consent: str
    license: str
    duration_sec: float
    speech_type: str = "scripted_read"
    technical_terms: List[str] = Field(default_factory=list)
    audio_path: str
    reference_devanagari_path: str
    reference_roman_path: Optional[str] = None
    reference_devanagari: str = ""
    reference_roman: str = ""


class BenchmarkMetrics(BaseModel):
    wer: float  # Word error rate percentage (0.0 to 100.0) raw (Devanagari+English)
    cer: float  # Character error rate percentage (0.0 to 100.0) raw (Devanagari+English)
    wer_roman: Optional[float] = None  # Script-agnostic WER (both sides transliterated to Roman)
    cer_roman: Optional[float] = None  # Script-agnostic CER (both sides transliterated to Roman)
    technical_term_accuracy: float  # Accuracy percentage (0.0 to 100.0)
    code_switch_score: Optional[float] = None  # Preservation score (0.0 to 100.0)
    latency_sec: float
    cost_per_minute: Optional[float] = None
    estimated_cost_usd: Optional[float] = None
    is_estimated: bool = False


class BenchmarkEvaluationResult(BaseModel):
    clip_id: str
    model_id: str
    model_name: str
    provider_version: Optional[str] = None
    source: str
    license: str
    hypothesis_transcript: str
    reference_transcript: str
    metrics: BenchmarkMetrics


def normalise_text(text: str) -> str:
    """
    Standard normalisation rules for Hinglish and Indian language transcripts:
    1. Unicode NFC normalisation (ensures canonical composition of combining marks/matras).
    2. Strips Latin & Devanagari punctuation (including । and ॥).
    3. Lowercases text (canonicalises Latin/English script words).
    4. Trims leading/trailing whitespace and collapses repeated whitespace runs into a single space.
    """
    if not text:
        return ""
    # 1. Unicode NFC
    text = unicodedata.normalize("NFC", text)
    # 2. Strip punctuation
    text = "".join(" " if c in ALL_PUNCTUATION_SET else c for c in text)
    # 3. Lowercase
    text = text.lower()
    # 4. Collapse whitespace
    return " ".join(text.split())


def compute_wer_cer(reference: str, hypothesis: str) -> tuple[float, float]:
    """
    Computes WER and CER using jiwer over normalised text.
    Returns percentages (0.0 - 100.0).
    """
    import jiwer

    norm_ref = normalise_text(reference)
    norm_hyp = normalise_text(hypothesis)

    if not norm_ref:
        # Edge case: empty reference
        return (0.0, 0.0) if not norm_hyp else (100.0, 100.0)

    wer_val = float(jiwer.wer(norm_ref, norm_hyp)) * 100.0
    cer_val = float(jiwer.cer(norm_ref, norm_hyp)) * 100.0
    return round(wer_val, 2), round(cer_val, 2)


def compute_wer_cer_script_agnostic(
    reference: str,
    hypothesis: str,
    transliterate_fn=None,
) -> tuple[float, float, str, str]:
    """
    Fairness Rule: Script-agnostic WER/CER where BOTH reference and hypothesis
    go through the SAME transliterator to Roman first.
    Never transliterates only one side.

    Returns (wer_roman, cer_roman, ref_roman, hyp_roman).
    """
    if transliterate_fn is None:
        from backend.app.services.transliteration.service import transliteration_service
        transliterate_fn = transliteration_service.transliterate_text

    ref_roman = transliterate_fn(reference)
    hyp_roman = transliterate_fn(hypothesis)

    wer_val, cer_val = compute_wer_cer(ref_roman, hyp_roman)
    return wer_val, cer_val, ref_roman, hyp_roman


def compute_technical_term_accuracy(terms: List[str], hypothesis: str) -> float:
    """
    Measures accuracy of technical domain terms in the transcript.
    Matches terms against normalised hypothesis text.
    Returns percentage (0.0 - 100.0).
    """
    if not terms:
        return 100.0

    norm_hyp = normalise_text(hypothesis)
    found_count = 0

    for term in terms:
        norm_term = normalise_text(term)
        if not norm_term:
            continue
        # Search for exact substring/word boundary match
        # Using word token boundary check
        term_words = norm_term.split()
        hyp_words = norm_hyp.split()

        # Check if the term_words sequence appears in hyp_words
        term_len = len(term_words)
        found = False
        for i in range(len(hyp_words) - term_len + 1):
            if hyp_words[i : i + term_len] == term_words:
                found = True
                break
        
        # Fallback substring check in case of hyphenation/spacing variance
        if not found and norm_term in norm_hyp:
            found = True

        if found:
            found_count += 1

    return round((found_count / len(terms)) * 100.0, 2)


def compute_code_switch_preservation(reference: str, hypothesis: str) -> float:
    """
    Measures the preservation of code-switched (Latin / English script tokens in Hinglish).
    Identifies English/Latin tokens in reference and checks retention in hypothesis.
    Returns score percentage (0.0 - 100.0).
    """
    norm_ref = normalise_text(reference)
    norm_hyp = normalise_text(hypothesis)

    ref_words = norm_ref.split()
    hyp_words = set(norm_hyp.split())

    # English / Latin words are ASCII alphabet sequences
    ref_latin_words = [w for w in ref_words if w.isascii() and any(c.isalpha() for c in w)]

    if not ref_latin_words:
        return 100.0

    preserved_count = sum(1 for w in ref_latin_words if w in hyp_words)
    return round((preserved_count / len(ref_latin_words)) * 100.0, 2)


def compute_cost_and_latency(
    duration_seconds: float,
    latency_seconds: float,
    provider_key: str,
    price_per_minute: Optional[float] = None,
) -> tuple[float, Optional[float], Optional[float]]:
    """
    Calculates latency, price per minute, and total estimated cost in USD.
    If price_per_minute is None, cost is marked as not configured (None).
    """
    if price_per_minute is None:
        return round(latency_seconds, 2), None, None
    duration_min = max(0.0, duration_seconds) / 60.0
    estimated_cost = round(duration_min * price_per_minute, 6)
    return round(latency_seconds, 2), round(price_per_minute, 4), estimated_cost


def load_benchmark_manifest(
    data_dir: str = "backend/benchmark_data",
) -> List[BenchmarkClip]:
    """
    Loads benchmark clips from manifest.csv.
    Strictly skips any clip where consent is NOT 'yes' or 'n/a' (case-insensitive).
    Extracts source and license for each clip.
    """
    manifest_path = os.path.join(data_dir, "manifest.csv")
    if not os.path.exists(manifest_path):
        raise FileNotFoundError(f"Benchmark manifest not found at: {manifest_path}")

    clips: List[BenchmarkClip] = []

    with open(manifest_path, mode="r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            clip_id = row.get("clip_id", "").strip()
            consent = row.get("consent", "").strip().lower()
            source = row.get("source", "").strip()
            license_val = row.get("license", "").strip()
            speech_type = row.get("speech_type", "scripted_read").strip()
            duration_sec = float(row.get("duration_sec", "0.0").strip() or 0.0)

            # Technical terms can be semicolon- or comma-separated
            raw_terms = row.get("technical_terms", "")
            if ";" in raw_terms:
                tech_terms = [t.strip() for t in raw_terms.split(";") if t.strip()]
            else:
                tech_terms = [t.strip() for t in raw_terms.split(",") if t.strip()]

            # Consent rule: Skip any clip where consent is not "yes" or "n/a" for public data
            if consent not in ("yes", "n/a"):
                continue

            audio_file = os.path.join(data_dir, "clips", f"{clip_id}.wav")
            ref_dev_file = os.path.join(data_dir, "references", f"{clip_id}.txt")
            ref_rom_file = os.path.join(data_dir, "references_roman", f"{clip_id}.txt")

            ref_dev = ""
            if os.path.exists(ref_dev_file):
                with open(ref_dev_file, mode="r", encoding="utf-8") as rf:
                    ref_dev = rf.read().strip()

            ref_rom = ""
            if os.path.exists(ref_rom_file):
                with open(ref_rom_file, mode="r", encoding="utf-8") as rf:
                    ref_rom = rf.read().strip()

            clips.append(
                BenchmarkClip(
                    clip_id=clip_id,
                    source=source,
                    consent=consent,
                    license=license_val,
                    duration_sec=duration_sec,
                    speech_type=speech_type,
                    technical_terms=tech_terms,
                    audio_path=audio_file,
                    reference_devanagari_path=ref_dev_file,
                    reference_roman_path=ref_rom_file if os.path.exists(ref_rom_file) else None,
                    reference_devanagari=ref_dev,
                    reference_roman=ref_rom,
                )
            )

    return clips

