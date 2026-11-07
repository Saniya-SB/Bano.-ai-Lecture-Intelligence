from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import select, func, cast, Integer

from backend.app.db.session import get_db
from backend.app.models.entities import BenchmarkRun
from backend.app.schemas.benchmark import BenchmarkModelResultDto, BenchmarkClipDetailDto

router = APIRouter()


@router.get("/benchmark/results", response_model=List[BenchmarkModelResultDto])
def get_benchmark_results(
    db: Session = Depends(get_db)
) -> List[BenchmarkModelResultDto]:
    """
    Returns aggregated benchmark results per model.
    Only returns empirical, measured evaluation results stored in the database.
    Never fabricates fake data. If no runs exist, returns an empty list.
    """
    # Group by model_id, model_name, source, license
    stmt = (
        select(
            BenchmarkRun.model_id,
            BenchmarkRun.model_name,
            func.avg(BenchmarkRun.wer).label("avg_wer"),
            func.avg(BenchmarkRun.cer).label("avg_cer"),
            func.avg(BenchmarkRun.wer_roman).label("avg_wer_roman"),
            func.avg(BenchmarkRun.cer_roman).label("avg_cer_roman"),
            func.avg(BenchmarkRun.technical_term_accuracy).label("avg_term_acc"),
            func.avg(BenchmarkRun.processing_time_sec).label("mean_latency"),
            func.min(BenchmarkRun.processing_time_sec).label("min_latency"),
            func.max(BenchmarkRun.processing_time_sec).label("max_latency"),
            func.sum(BenchmarkRun.processing_time_sec).label("total_processing_time"),
            func.sum(BenchmarkRun.estimated_cost_usd).label("total_cost"),
            func.max(cast(BenchmarkRun.is_estimated, Integer)).label("is_estimated_int"),
            func.max(BenchmarkRun.source).label("source"),
            func.max(BenchmarkRun.license).label("license"),
        )
        .group_by(BenchmarkRun.model_id, BenchmarkRun.model_name)
        .order_by(BenchmarkRun.model_name)
    )

    rows = db.execute(stmt).all()
    results: List[BenchmarkModelResultDto] = []

    for r in rows:
        # Fetch all latency values for this model to compute exact median
        latencies = [
            float(val[0])
            for val in db.query(BenchmarkRun.processing_time_sec)
            .filter(BenchmarkRun.model_id == r.model_id)
            .all()
            if val[0] is not None
        ]
        import statistics
        median_lat = round(float(statistics.median(latencies)), 2) if latencies else None

        results.append(
            BenchmarkModelResultDto(
                model_id=r.model_id,
                model_name=r.model_name,
                wer=round(float(r.avg_wer or 0.0), 2),
                cer=round(float(r.avg_cer or 0.0), 2),
                wer_roman=round(float(r.avg_wer_roman), 2) if r.avg_wer_roman is not None else None,
                cer_roman=round(float(r.avg_cer_roman), 2) if r.avg_cer_roman is not None else None,
                technical_term_accuracy=round(float(r.avg_term_acc or 0.0), 2),
                processing_time_sec=round(float(r.total_processing_time or 0.0), 2),
                mean_latency_sec=round(float(r.mean_latency or 0.0), 2),
                median_latency_sec=median_lat,
                min_latency_sec=round(float(r.min_latency), 2) if r.min_latency is not None else None,
                max_latency_sec=round(float(r.max_latency), 2) if r.max_latency is not None else None,
                estimated_cost_usd=round(float(r.total_cost), 4) if (r.total_cost is not None and float(r.total_cost) > 0.0) else None,
                is_estimated=bool(r.is_estimated_int),
                source=r.source,
                license=r.license,
            )
        )

    return results


@router.get("/benchmark/details", response_model=List[BenchmarkClipDetailDto])
def get_benchmark_details(
    db: Session = Depends(get_db)
) -> List[BenchmarkClipDetailDto]:
    """
    Returns granular benchmark runs across all clips.
    """
    runs = db.query(BenchmarkRun).order_by(BenchmarkRun.run_timestamp.desc()).all()
    return [
        BenchmarkClipDetailDto(
            id=run.id,
            clip_id=run.reference.sample_name if run.reference else run.reference_id,
            model_id=run.model_id,
            model_name=run.model_name,
            hypothesis_transcript=run.hypothesis_transcript,
            hypothesis_roman=run.hypothesis_roman,
            reference_transcript=run.reference.ground_truth_devanagari if run.reference else None,
            wer=float(run.wer),
            cer=float(run.cer),
            wer_roman=float(run.wer_roman) if run.wer_roman is not None else None,
            cer_roman=float(run.cer_roman) if run.cer_roman is not None else None,
            technical_term_accuracy=float(run.technical_term_accuracy),
            code_switch_score=float(run.code_switch_score) if run.code_switch_score is not None else None,
            processing_time_sec=float(run.processing_time_sec),
            estimated_cost_usd=float(run.estimated_cost_usd) if run.estimated_cost_usd is not None else None,
            is_estimated=run.is_estimated,
            source=run.source,
            license=run.license,
            run_timestamp=run.run_timestamp.isoformat() if run.run_timestamp else "",
        )
        for run in runs
    ]
