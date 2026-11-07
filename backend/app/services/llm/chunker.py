from typing import Any
import math
from backend.app.core.config import settings
from backend.app.models.entities import TranscriptSegment


class TranscriptChunk:
    def __init__(self, index: int, segments: list[TranscriptSegment]):
        self.index = index
        self.segments = segments

    @property
    def start_time(self) -> float:
        return self.segments[0].start_time if self.segments else 0.0

    @property
    def end_time(self) -> float:
        return self.segments[-1].end_time if self.segments else 0.0

    def format_for_prompt(self) -> str:
        """
        Formats each segment with its ID, timestamp, and text for exact attribution.
        """
        lines = []
        for s in self.segments:
            lines.append(
                f"[ID:{s.id} | {s.start_time:.1f}s - {s.end_time:.1f}s]: {s.text}"
            )
        return "\n".join(lines)


def estimate_tokens(text: str) -> int:
    """
    Heuristic token estimation: ~4 characters per token for English/Hinglish text.
    """
    return max(1, math.ceil(len(text) / 4.0))


def chunk_transcript_segments(
    segments: list[TranscriptSegment],
    max_tokens: int | None = None,
    overlap_tokens: int | None = None,
) -> list[TranscriptChunk]:
    """
    Chunks transcript segments respecting token budgets while maintaining segment boundaries.
    For small/medium lectures within budget (e.g. 1-2 hour lectures with modern 1M context models),
    returns a single unified chunk.
    """
    if not segments:
        return []

    limit = max_tokens or settings.LLM_CHUNK_MAX_TOKENS
    overlap = overlap_tokens or settings.LLM_CHUNK_OVERLAP_TOKENS

    chunks: list[TranscriptChunk] = []
    current_segments: list[TranscriptSegment] = []
    current_tokens = 0

    for seg in segments:
        seg_tokens = estimate_tokens(seg.text)
        if current_tokens + seg_tokens > limit and current_segments:
            # Finalize chunk
            chunks.append(TranscriptChunk(index=len(chunks), segments=list(current_segments)))
            
            # Form overlap from end of current chunk
            overlap_accum: list[TranscriptSegment] = []
            overlap_count = 0
            for prev_seg in reversed(current_segments):
                prev_toks = estimate_tokens(prev_seg.text)
                if overlap_count + prev_toks <= overlap:
                    overlap_accum.insert(0, prev_seg)
                    overlap_count += prev_toks
                else:
                    break
            
            current_segments = overlap_accum + [seg]
            current_tokens = sum(estimate_tokens(s.text) for s in current_segments)
        else:
            current_segments.append(seg)
            current_tokens += seg_tokens

    if current_segments:
        chunks.append(TranscriptChunk(index=len(chunks), segments=current_segments))

    return chunks

