"""
Public benchmark summary endpoint — no authentication required.
Only returns aggregate scores and clip count. No audio, no user data.
"""

from typing import List, Optional
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import select, func

from backend.app.db.session import get_db
from backend.app.models.entities import BenchmarkRun

router = APIRouter(tags=["Benchmark Public"])


class PublicModelSummary(BaseModel):
    model_name: str
    wer: Optional[float] = None
    cer: Optional[float] = None
    technical_term_accuracy: Optional[float] = None
    median_latency_sec: Optional[float] = None
    estimated_cost_usd: Optional[float] = None  # None when self-hosted / not configured


class PublicBenchmarkSummary(BaseModel):
    clip_count: int
    models: List[PublicModelSummary]
    caveat: str = "3 scripted Hinglish clips (~70 s), local test, not a general ranking."


@router.get("/benchmark/public-summary", response_model=PublicBenchmarkSummary)
def get_public_benchmark_summary(db: Session = Depends(get_db)) -> PublicBenchmarkSummary:
    """
    Public read-only endpoint — no auth.
    Returns aggregate benchmark scores per model and the total clip count.
    Never exposes raw transcripts, audio, or user data.
    """
    # Clip count = number of distinct reference clips
    try:
        clip_count_row = db.execute(
            select(func.count(func.distinct(BenchmarkRun.reference_id)))
        ).scalar()
        clip_count = int(clip_count_row or 0)

        stmt = (
            select(
                BenchmarkRun.model_name,
                func.avg(BenchmarkRun.wer).label("avg_wer"),
                func.avg(BenchmarkRun.cer).label("avg_cer"),
                func.avg(BenchmarkRun.technical_term_accuracy).label("avg_term_acc"),
                func.avg(BenchmarkRun.processing_time_sec).label("avg_latency"),
                func.sum(BenchmarkRun.estimated_cost_usd).label("total_cost"),
            )
            .group_by(BenchmarkRun.model_name)
            .order_by(BenchmarkRun.model_name)
        )
        rows = db.execute(stmt).all()

        models: List[PublicModelSummary] = []
        for r in rows:
            # Compute exact median latency per model
            latencies = [
                float(val[0])
                for val in db.query(BenchmarkRun.processing_time_sec)
                .filter(BenchmarkRun.model_name == r.model_name)
                .all()
                if val[0] is not None
            ]
            import statistics
            median_lat = round(float(statistics.median(latencies)), 2) if latencies else None

            # Only expose cost when non-zero (i.e. not self-hosted free tier)
            total_cost = float(r.total_cost) if r.total_cost else 0.0
            cost_to_expose = round(total_cost, 4) if total_cost > 0.0001 else None

            models.append(
                PublicModelSummary(
                    model_name=str(r.model_name),
                    wer=round(float(r.avg_wer), 2) if r.avg_wer is not None else None,
                    cer=round(float(r.avg_cer), 2) if r.avg_cer is not None else None,
                    technical_term_accuracy=round(float(r.avg_term_acc), 2) if r.avg_term_acc is not None else None,
                    median_latency_sec=median_lat,
                    estimated_cost_usd=cost_to_expose,
                )
            )

        return PublicBenchmarkSummary(
            clip_count=clip_count,
            models=models,
        )

    except Exception:
        # DB not set up yet — return empty gracefully
        return PublicBenchmarkSummary(clip_count=0, models=[])

