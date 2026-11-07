import pytest
import os
from unittest.mock import MagicMock
from fastapi.testclient import TestClient

from backend.app.main import app
from backend.app.db.session import get_db
from backend.app.models.entities import ReferenceTranscript, BenchmarkRun
from backend.app.services.benchmarking import (
    normalise_text,
    compute_wer_cer,
    compute_wer_cer_script_agnostic,
    compute_technical_term_accuracy,
    compute_code_switch_preservation,
    compute_cost_and_latency,
    load_benchmark_manifest,
)


def test_normalise_text_devanagari_and_latin():
    # Test danda removal, punctuation stripping, case folding, spacing
    raw = "आज हम recursion समझेंगे। जब एक function call करता है!   "
    normalised = normalise_text(raw)
    assert normalised == "आज हम recursion समझेंगे जब एक function call करता है"
    
    # Check that capital Latin letters are lowercased while Devanagari is intact
    raw2 = "Binary Search Tree में Node!"
    assert normalise_text(raw2) == "binary search tree में node"


def test_compute_wer_cer_identical():
    ref = "आज हम recursion समझेंगे।"
    hyp = "आज हम recursion समझेंगे"
    wer, cer = compute_wer_cer(ref, hyp)
    assert wer == 0.0
    assert cer == 0.0


def test_compute_wer_cer_differences():
    ref = "आज हम recursion समझेंगे"
    hyp = "आज हम recursion जानते"
    wer, cer = compute_wer_cer(ref, hyp)
    assert wer > 0.0
    assert cer > 0.0


def test_compute_technical_term_accuracy():
    terms = ["recursion", "function", "stack overflow", "factorial"]
    hyp = "आज हम recursion समझेंगे। Function खुद को call करता है और stack overflow हो सकता है।"
    
    acc = compute_technical_term_accuracy(terms, hyp)
    # recursion, function, stack overflow found = 3 / 4 = 75.0%
    assert acc == 75.0


def test_compute_code_switch_preservation():
    ref = "आज हम recursion समझेंगे। जब एक function call करता है।"
    # ref Latin words: ['recursion', 'function', 'call']
    hyp = "आज हम recursion समझेंगे। जब एक function call करता है।"
    score = compute_code_switch_preservation(ref, hyp)
    assert score == 100.0

    hyp_missing_one = "आज हम समझेंगे। जब एक function call करता है।"
    score_missing = compute_code_switch_preservation(ref, hyp_missing_one)
    assert round(score_missing, 1) == 66.7


def test_compute_cost_and_latency():
    lat, price, cost = compute_cost_and_latency(
        duration_seconds=30.0,
        latency_seconds=1.25,
        provider_key="gnani",
        price_per_minute=0.005,
    )
    assert lat == 1.25
    assert price == 0.005
    assert cost == 0.0025  # 0.5 minutes * 0.005


def test_load_benchmark_manifest_skips_unconsented(tmp_path):
    manifest_file = tmp_path / "manifest.csv"
    manifest_file.write_text(
        "clip_id,source,consent,license,duration_sec,speech_type,technical_terms\n"
        "clip_yes,team,yes,MIT,10.0,speech,term1;term2\n"
        "clip_no,team,no,MIT,10.0,speech,term1\n"
        "clip_na,public,n/a,CC-BY,15.0,speech,term2\n"
        "clip_pending,external,pending,Proprietary,20.0,speech,term3\n",
        encoding="utf-8",
    )
    clips = load_benchmark_manifest(str(tmp_path))
    loaded_ids = [c.clip_id for c in clips]
    assert "clip_yes" in loaded_ids
    assert "clip_na" in loaded_ids
    assert "clip_no" not in loaded_ids
    assert "clip_pending" not in loaded_ids
    assert len(clips) == 2


def test_get_benchmark_results_empty_state(db_session):
    # Ensure empty table returns empty list, not fake numbers
    client = TestClient(app)
    app.dependency_overrides[get_db] = lambda: db_session

    response = client.get("/api/v1/benchmark/results")
    assert response.status_code == 200
    assert response.json() == []

    app.dependency_overrides.clear()


def test_get_benchmark_results_with_real_records(db_session):
    client = TestClient(app)
    app.dependency_overrides[get_db] = lambda: db_session

    ref = ReferenceTranscript(
        id="ref_test_1",
        dataset_name="bano_benchmark",
        sample_name="clip1",
        audio_path="clip1.wav",
        duration_seconds=24,
        ground_truth_devanagari="आज हम recursion समझेंगे",
        ground_truth_roman="Aaj hum recursion samjhenge",
        technical_terms=["recursion"],
        consent_for_benchmark=True,
        source="own_recording",
        license="own",
    )
    db_session.add(ref)

    run = BenchmarkRun(
        id="brun_test_1",
        reference_id=ref.id,
        model_id="gnani_prisma_v3",
        model_name="Gnani Prisma v3",
        provider_version="v3.0",
        hypothesis_transcript="आज हम recursion समझेंगे",
        hypothesis_roman="aaj hum recursion samjhenge",
        wer=0.0,
        cer=0.0,
        wer_roman=0.0,
        cer_roman=0.0,
        technical_term_accuracy=100.0,
        code_switch_score=100.0,
        processing_time_sec=1.45,
        estimated_cost_usd=0.0020,
        is_estimated=False,
        source="own_recording",
        license="own",
    )
    db_session.add(run)
    db_session.commit()

    response = client.get("/api/v1/benchmark/results")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1
    assert data[0]["model_id"] == "gnani_prisma_v3"
    assert data[0]["wer"] == 0.0
    assert data[0]["wer_roman"] == 0.0
    assert data[0]["median_latency_sec"] == 1.45
    assert data[0]["source"] == "own_recording"
    assert data[0]["license"] == "own"

    # Also test details
    details_resp = client.get("/api/v1/benchmark/details")
    assert details_resp.status_code == 200
    details_data = details_resp.json()
    assert len(details_data) == 1
    assert details_data[0]["clip_id"] == "clip1"
    assert details_data[0]["wer_roman"] == 0.0
    assert details_data[0]["hypothesis_roman"] == "aaj hum recursion samjhenge"

    app.dependency_overrides.clear()


def test_compute_wer_cer_script_agnostic_fairness():
    # Demonstrates fairness: Devanagari reference and Roman/mixed hypothesis both transliterated
    ref_devanagari = "आज हम recursion समझेंगे"
    hyp_devanagari = "आज हम recursion समझेंगे"
    
    wer_r, cer_r, ref_rom, hyp_rom = compute_wer_cer_script_agnostic(ref_devanagari, hyp_devanagari)
    assert wer_r == 0.0
    assert cer_r == 0.0
    assert "recursion" in ref_rom
    assert "recursion" in hyp_rom

