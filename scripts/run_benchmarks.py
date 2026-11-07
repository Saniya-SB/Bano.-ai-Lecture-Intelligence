#!/usr/bin/env python3
"""
CLI script to run N STT providers on benchmark clips and record results to the DB plus a CSV.

Usage:
  python scripts/run_benchmarks.py --providers gnani
  python scripts/run_benchmarks.py --providers faster_whisper
  python scripts/run_benchmarks.py --providers gnani,faster_whisper --output-csv backend/benchmark_data/benchmark_results.csv
  python scripts/run_benchmarks.py --all-providers
"""
import os
import sys
import csv
import time
import uuid
import argparse
import asyncio
import statistics
from typing import List, Dict, Any, Optional

# Ensure repository root is on sys.path
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

from backend.app.core.config import settings
from backend.app.core.logging import logger
from backend.app.db.session import SessionLocal
from backend.app.models.entities import ReferenceTranscript, BenchmarkRun
from backend.app.services.benchmarking import (
    load_benchmark_manifest,
    compute_wer_cer,
    compute_wer_cer_script_agnostic,
    compute_technical_term_accuracy,
    compute_code_switch_preservation,
    compute_cost_and_latency,
    BenchmarkClip,
)
from backend.app.services.gnani_provider import GnaniSTTProvider


# Base Provider Interface for Benchmarking
class BaseBenchmarkProvider:
    provider_id: str
    model_name: str
    provider_version: Optional[str] = None

    async def transcribe_audio(self, audio_path: str) -> str:
        raise NotImplementedError

    def is_configured(self) -> tuple[bool, str]:
        """Returns (is_ready, missing_key_instructions)"""
        raise NotImplementedError


class GnaniBenchmarkProvider(BaseBenchmarkProvider):
    provider_id = "gnani_prisma_v3"
    model_name = "Gnani Prisma v3 (Hinglish codemix)"
    provider_version = "v3.0"

    def __init__(self):
        self.client = GnaniSTTProvider()

    def is_configured(self) -> tuple[bool, str]:
        if settings.GNANI_API_KEY and settings.GNANI_API_KEY.strip():
            return True, ""
        return (
            False,
            "GNANI_API_KEY is missing. Please set GNANI_API_KEY in your environment or backend/.env file.\n"
            "Format: GNANI_API_KEY=vach_...\n"
            "Obtain your key from the Gnani Console (https://vachana.ai)."
        )

    async def transcribe_audio(self, audio_path: str) -> str:
        with open(audio_path, "rb") as f:
            audio_bytes = f.read()

        import wave
        with wave.open(audio_path, "rb") as w:
            duration = w.getnframes() / float(w.getframerate())

        normalised = await self.client.transcribe(
            audio_bytes=audio_bytes,
            lecture_id=f"bench_{uuid.uuid4().hex[:6]}",
            filename=os.path.basename(audio_path),
            duration_seconds=duration,
        )
        return normalised.full_text_devanagari


class FasterWhisperBenchmarkProvider(BaseBenchmarkProvider):
    def __init__(self):
        model_size = getattr(settings, "FASTER_WHISPER_MODEL", "small") or "small"
        self.model_size = model_size
        self.provider_id = f"faster_whisper_{model_size}"
        self.model_name = f"faster-whisper ({model_size})"
        try:
            import faster_whisper
            fw_version = getattr(faster_whisper, "__version__", "1.2.1")
        except Exception:
            fw_version = "unknown"
        self.provider_version = f"{model_size}/{fw_version}"
        self._model = None

    def _get_model(self):
        if self._model is None:
            # Patch PyAV 19 compatibility if needed
            try:
                import av
                _orig_open = av.open
                def _patched_open(*args, **kwargs):
                    kwargs.pop("metadata_errors", None)
                    return _orig_open(*args, **kwargs)
                av.open = _patched_open
            except Exception:
                pass

            from faster_whisper import WhisperModel
            # Load model on CPU
            self._model = WhisperModel(self.model_size, device="cpu", compute_type="default")
        return self._model

    def is_configured(self) -> tuple[bool, str]:
        try:
            import faster_whisper
            return True, ""
        except ImportError:
            return (
                False,
                "faster-whisper is not installed.\n"
                "To enable local faster-whisper benchmarking, run:\n"
                "  pip install faster-whisper>=1.0.0"
            )

    async def transcribe_audio(self, audio_path: str) -> str:
        # Run blocking model inference in asyncio thread pool
        def _transcribe():
            model = self._get_model()
            segments, info = model.transcribe(
                audio_path,
                beam_size=5,
                language="hi",
                task="transcribe",
            )
            # Concatenate segment texts
            return " ".join([seg.text.strip() for seg in segments if seg.text.strip()])

        return await asyncio.to_thread(_transcribe)


class WhisperBenchmarkProvider(BaseBenchmarkProvider):
    provider_id = "openai_whisper_1"
    model_name = "OpenAI Whisper-1"
    provider_version = "whisper-1"

    def is_configured(self) -> tuple[bool, str]:
        api_key = settings.OPENAI_API_KEY or os.environ.get("OPENAI_API_KEY", "")
        if api_key and api_key.strip():
            return True, ""
        return (
            False,
            "OPENAI_API_KEY is missing for OpenAI Whisper provider.\n"
            "To enable benchmarking on Whisper, add to backend/.env:\n"
            "  OPENAI_API_KEY=sk-...\n"
            "Obtain your API key from https://platform.openai.com/api-keys."
        )

    async def transcribe_audio(self, audio_path: str) -> str:
        import httpx
        api_key = settings.OPENAI_API_KEY or os.environ.get("OPENAI_API_KEY", "")
        headers = {"Authorization": f"Bearer {api_key}"}

        with open(audio_path, "rb") as f:
            files = {"file": (os.path.basename(audio_path), f, "audio/wav")}
            data = {"model": "whisper-1"}
            async with httpx.AsyncClient(timeout=120.0) as client:
                resp = await client.post(
                    "https://api.openai.com/v1/audio/transcriptions",
                    headers=headers,
                    files=files,
                    data=data,
                )
                resp.raise_for_status()
                payload = resp.json()
                return payload.get("text", "")


AVAILABLE_PROVIDERS: Dict[str, BaseBenchmarkProvider] = {
    "gnani": GnaniBenchmarkProvider(),
    "faster_whisper": FasterWhisperBenchmarkProvider(),
    "whisper": WhisperBenchmarkProvider(),
}


def sync_reference_transcripts(db, clips: List[BenchmarkClip]) -> Dict[str, str]:
    """
    Ensures consented reference transcripts exist in the DB, returning a mapping of clip_id -> reference_id.
    """
    ref_map = {}
    for clip in clips:
        ref = (
            db.query(ReferenceTranscript)
            .filter(
                ReferenceTranscript.dataset_name == "bano_benchmark",
                ReferenceTranscript.sample_name == clip.clip_id,
            )
            .first()
        )
        if not ref:
            ref_id = f"ref_{clip.clip_id}"
            ref = ReferenceTranscript(
                id=ref_id,
                dataset_name="bano_benchmark",
                sample_name=clip.clip_id,
                audio_path=clip.audio_path,
                duration_seconds=int(clip.duration_sec),
                ground_truth_devanagari=clip.reference_devanagari,
                ground_truth_roman=clip.reference_roman,
                technical_terms=clip.technical_terms,
                consent_for_benchmark=True,
                source=clip.source,
                license=clip.license,
            )
            db.add(ref)
            db.commit()
            db.refresh(ref)
        else:
            # Update source & license if missing
            ref.source = clip.source
            ref.license = clip.license
            ref.technical_terms = clip.technical_terms
            db.commit()

        ref_map[clip.clip_id] = ref.id
    return ref_map


async def run_benchmark_for_clip_runs(
    provider: BaseBenchmarkProvider,
    clip: BenchmarkClip,
    price_per_min: Optional[float],
    repeats: int = 3,
) -> tuple[List[Dict[str, Any]], Dict[str, Any]]:
    """
    Runs transcription `repeats` times per clip.
    Computes both:
    1. Raw WER/CER against Devanagari reference.
    2. Script-agnostic WER/CER with BOTH reference and hypothesis transliterated to Roman.
    Returns list of run results (one per repeat) and an aggregated clip summary.
    """
    logger.info(f"[{provider.model_name}] Running {repeats} iterations on {clip.clip_id} ({clip.duration_sec}s)...")
    
    runs = []
    latencies = []
    last_hyp_text = ""
    last_hyp_roman = ""

    ref_text = clip.reference_devanagari

    for i in range(repeats):
        start_time = time.perf_counter()
        hyp_text = await provider.transcribe_audio(clip.audio_path)
        elapsed = time.perf_counter() - start_time
        latencies.append(elapsed)
        last_hyp_text = hyp_text

        # 1. Raw WER/CER
        raw_wer, raw_cer = compute_wer_cer(ref_text, hyp_text)

        # 2. Script-agnostic WER/CER (both sides transliterated to Roman)
        wer_roman, cer_roman, ref_rom, hyp_rom = compute_wer_cer_script_agnostic(
            reference=ref_text,
            hypothesis=hyp_text,
        )
        last_hyp_roman = hyp_rom

        tech_acc = compute_technical_term_accuracy(clip.technical_terms, hyp_text)
        code_switch = compute_code_switch_preservation(ref_text, hyp_text)
        lat_sec, price_min, est_cost = compute_cost_and_latency(
            duration_seconds=clip.duration_sec,
            latency_seconds=elapsed,
            provider_key=provider.provider_id,
            price_per_minute=price_per_min,
        )

        runs.append({
            "clip_id": clip.clip_id,
            "source": clip.source,
            "license": clip.license,
            "duration_sec": clip.duration_sec,
            "model_id": provider.provider_id,
            "model_name": provider.model_name,
            "provider_version": provider.provider_version,
            "run_index": i + 1,
            "hypothesis_transcript": hyp_text,
            "hypothesis_roman": hyp_rom,
            "reference_transcript": ref_text,
            "wer": raw_wer,
            "cer": raw_cer,
            "wer_roman": wer_roman,
            "cer_roman": cer_roman,
            "technical_term_accuracy": tech_acc,
            "code_switch_score": code_switch,
            "processing_time_sec": lat_sec,
            "cost_per_minute": price_min,
            "estimated_cost_usd": est_cost,
            "is_estimated": False,
        })

    clip_summary = {
        "clip_id": clip.clip_id,
        "median_latency_sec": round(float(statistics.median(latencies)), 2),
        "min_latency_sec": round(float(min(latencies)), 2),
        "max_latency_sec": round(float(max(latencies)), 2),
        "mean_latency_sec": round(float(statistics.mean(latencies)), 2),
        "raw_wer": runs[-1]["wer"],
        "raw_cer": runs[-1]["cer"],
        "wer_roman": runs[-1]["wer_roman"],
        "cer_roman": runs[-1]["cer_roman"],
        "tech_acc": runs[-1]["technical_term_accuracy"],
        "code_switch": runs[-1]["code_switch_score"],
        "last_hyp_text": last_hyp_text,
        "last_hyp_roman": last_hyp_roman,
    }

    return runs, clip_summary


async def main_async(args):
    # 1. Load benchmark manifest
    data_dir = os.path.abspath(args.data_dir)
    print(f"[INFO] Loading benchmark clips from {data_dir} ...")
    try:
        clips = load_benchmark_manifest(data_dir)
    except Exception as e:
        print(f"[ERROR] Failed to load benchmark clips: {e}")
        sys.exit(1)

    print(f"[SUCCESS] Loaded {len(clips)} consented clip(s): {[c.clip_id for c in clips]}")

    # 2. Determine providers
    selected_provider_names = [p.strip().lower() for p in args.providers.split(",") if p.strip()]
    if args.all_providers:
        selected_provider_names = list(AVAILABLE_PROVIDERS.keys())

    active_providers: List[BaseBenchmarkProvider] = []
    for name in selected_provider_names:
        if name not in AVAILABLE_PROVIDERS:
            print(f"[ERROR] Unknown provider '{name}'. Available options: {list(AVAILABLE_PROVIDERS.keys())}")
            sys.exit(1)
        prov = AVAILABLE_PROVIDERS[name]
        is_ok, setup_msg = prov.is_configured()
        if not is_ok:
            print(f"\n[WARNING / ACTION REQUIRED] Provider '{name}' is not configured:")
            print(f"----------------------------------------------------------------------")
            print(setup_msg)
            print(f"----------------------------------------------------------------------")
            if not args.ignore_missing_keys:
                print(f"[ABORT] Cannot proceed without required provider credentials.")
                print(f"Provide credentials, or run with --providers {','.join([p for p in selected_provider_names if p != name])}")
                sys.exit(1)
            else:
                print(f"[SKIP] Skipping unconfigured provider '{name}'.\n")
                continue
        active_providers.append(prov)

    if not active_providers:
        print("[ERROR] No configured providers available to run. Exiting.")
        sys.exit(1)

    # 3. Database session and reference sync
    db = SessionLocal()
    ref_map = sync_reference_transcripts(db, clips)

    all_runs: List[Dict[str, Any]] = []

    # 4. Evaluate each provider on each clip (3 repeats per clip)
    repeats = args.repeats
    for prov in active_providers:
        pricing_key = "gnani" if "gnani" in prov.provider_id else ("faster_whisper" if "faster_whisper" in prov.provider_id else "whisper")
        price_per_min = settings.STT_PRICING_PER_MINUTE.get(pricing_key)
        if "faster_whisper" in prov.provider_id:
            price_per_min = 0.0  # Local inference is free of API charges

        print(f"\n======================================================================")
        print(f"Running Benchmark on: {prov.model_name} (version: {prov.provider_version})")
        cost_str = f"${price_per_min:.4f}/min" if price_per_min is not None else "not configured"
        print(f"Cost per minute: {cost_str} | Latency runs per clip: {repeats}")
        print(f"======================================================================")

        for clip in clips:
            print(f"\n--- Clip: {clip.clip_id} ({clip.source}, license: {clip.license}) ---")
            try:
                runs, summary = await run_benchmark_for_clip_runs(
                    provider=prov,
                    clip=clip,
                    price_per_min=price_per_min,
                    repeats=repeats,
                )
                all_runs.extend(runs)

                # Persist each run into the DB
                ref_id = ref_map[clip.clip_id]
                for r in runs:
                    run_record = BenchmarkRun(
                        id=f"brun_{uuid.uuid4().hex[:12]}",
                        reference_id=ref_id,
                        model_id=prov.provider_id,
                        model_name=prov.model_name,
                        provider_version=prov.provider_version,
                        hypothesis_transcript=r["hypothesis_transcript"],
                        hypothesis_roman=r.get("hypothesis_roman"),
                        wer=r["wer"],
                        cer=r["cer"],
                        wer_roman=r.get("wer_roman"),
                        cer_roman=r.get("cer_roman"),
                        technical_term_accuracy=r["technical_term_accuracy"],
                        code_switch_score=r["code_switch_score"],
                        processing_time_sec=r["processing_time_sec"],
                        estimated_cost_usd=r["estimated_cost_usd"] or 0.0,
                        is_estimated=r["is_estimated"],
                        source=r["source"],
                        license=r["license"],
                    )
                    db.add(run_record)
                db.commit()

                print(f"  [Raw View]             WER: {summary['raw_wer']:.2f}% | CER: {summary['raw_cer']:.2f}%")
                print(f"  [Script-Agnostic View] WER: {summary['wer_roman']:.2f}% | CER: {summary['cer_roman']:.2f}%")
                print(f"  Tech Term Acc: {summary['tech_acc']:.2f}% | Code-Switch: {summary['code_switch']:.2f}%")
                print(f"  Latency (3 runs): median={summary['median_latency_sec']:.2f}s (min={summary['min_latency_sec']:.2f}s, max={summary['max_latency_sec']:.2f}s, mean={summary['mean_latency_sec']:.2f}s)")
            except Exception as e:
                print(f"[ERROR] Execution failed on {clip.clip_id}: {e}")
                db.rollback()

    db.close()

    # 5. Output CSV
    if args.output_csv and all_runs:
        csv_file = os.path.abspath(args.output_csv)
        os.makedirs(os.path.dirname(csv_file) or ".", exist_ok=True)
        fieldnames = [
            "clip_id",
            "model_id",
            "model_name",
            "provider_version",
            "run_index",
            "source",
            "license",
            "duration_sec",
            "wer",
            "cer",
            "wer_roman",
            "cer_roman",
            "technical_term_accuracy",
            "code_switch_score",
            "processing_time_sec",
            "cost_per_minute",
            "estimated_cost_usd",
            "is_estimated",
            "hypothesis_transcript",
            "hypothesis_roman",
        ]
        with open(csv_file, mode="w", newline="", encoding="utf-8") as f:
            writer = csv.DictWriter(f, fieldnames=fieldnames, extrasaction="ignore")
            writer.writeheader()
            for r in all_runs:
                writer.writerow(r)
        print(f"\n[SUCCESS] Wrote {len(all_runs)} benchmark run rows to CSV: {csv_file}")

    print("\n[DONE] Benchmark evaluation complete.")


def main():
    parser = argparse.ArgumentParser(description="Run benchmarking across STT providers.")
    parser.add_argument(
        "--data-dir",
        default="backend/benchmark_data",
        help="Path to directory containing clips/, references/, and manifest.csv",
    )
    parser.add_argument(
        "--providers",
        default="faster_whisper",
        help="Comma-separated list of providers to evaluate (e.g. gnani,faster_whisper,whisper)",
    )
    parser.add_argument(
        "--all-providers",
        action="store_true",
        help="Evaluate all available providers in the system",
    )
    parser.add_argument(
        "--repeats",
        type=int,
        default=3,
        help="Number of latency runs per clip (default: 3)",
    )
    parser.add_argument(
        "--output-csv",
        default="backend/benchmark_data/benchmark_results.csv",
        help="CSV file path to save detailed evaluation records",
    )
    parser.add_argument(
        "--ignore-missing-keys",
        action="store_true",
        help="Skip providers with missing API keys instead of terminating",
    )
    args = parser.parse_args()
    asyncio.run(main_async(args))


if __name__ == "__main__":
    main()
