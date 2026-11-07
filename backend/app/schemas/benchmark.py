from pydantic import BaseModel, Field
from typing import Optional


class BenchmarkModelResultDto(BaseModel):
    model_id: str
    model_name: str
    wer: float
    cer: float
    wer_roman: Optional[float] = None
    cer_roman: Optional[float] = None
    technical_term_accuracy: float
    processing_time_sec: float
    mean_latency_sec: Optional[float] = None
    median_latency_sec: Optional[float] = None
    min_latency_sec: Optional[float] = None
    max_latency_sec: Optional[float] = None
    total_duration_sec: Optional[float] = None
    estimated_cost_usd: Optional[float] = None
    is_estimated: bool
    source: Optional[str] = None
    license: Optional[str] = None


class BenchmarkClipDetailDto(BaseModel):
    id: str
    clip_id: str
    model_id: str
    model_name: str
    hypothesis_transcript: str
    hypothesis_roman: Optional[str] = None
    reference_transcript: Optional[str] = None
    wer: float
    cer: float
    wer_roman: Optional[float] = None
    cer_roman: Optional[float] = None
    technical_term_accuracy: float
    code_switch_score: Optional[float] = None
    processing_time_sec: float
    estimated_cost_usd: Optional[float] = None
    is_estimated: bool
    source: Optional[str] = None
    license: Optional[str] = None
    run_timestamp: str

