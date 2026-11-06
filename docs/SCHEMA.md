# Database Schema & State Machine Architecture

**Project:** Bano.ai – Hinglish Lecture Intelligence  
**Phase:** Phase 1 – Data & Foundation Architecture

---

## 1. Schema Overview

The PostgreSQL database stores lectures, their processing jobs, multi-version transcripts with segment-level metadata, AI-generated outputs, cost/token tracking events, and empirical benchmarking records.

### Entities

1. **`users`**
   - User identity supporting both mock auth (`usr_mock_1`) and Firebase UIDs.
   - Fields: `id`, `email`, `full_name`, `created_at`, `updated_at`.

2. **`lectures`**
   - Core lecture record tracking upload source and processing status.
   - Fields: `id`, `user_id`, `title`, `subject`, `topic`, `duration_seconds`, `status`, `sha256`, `source_type` (`upload`/`recording`/`youtube`), `source_url`, `audio_storage_path`, `mime_type`, `file_size_bytes`, `created_at`, `updated_at`.
   - Constraints: `UNIQUE(user_id, sha256)`.

3. **`transcription_jobs`**
   - Tracks the progress and state machine of background transcription.
   - Fields: `id`, `lecture_id` (1:1 with `lectures`), `provider`, `provider_job_id`, `stage`, `progress_percent`, `error_message`, `error_code`, `retry_count`, `started_at`, `completed_at`, `created_at`, `updated_at`.

4. **`transcripts` & `transcript_segments`**
   - Stores multiple versions of transcripts per lecture (`raw`, `normalised`, `roman`, `corrected`).
   - `transcripts` constraints: `UNIQUE(lecture_id, version_type)`.
   - `transcript_segments` fields: `id`, `transcript_id`, `segment_index`, `start_time`, `end_time`, `text`, `segment_type` (`concept`/`example`/`admin`/`off_topic`), `speaker_label`, `confidence`, `created_at`.

5. **`generated_outputs`**
   - Caches prompt outputs (`summary_short`, `summary_detailed`, `notes`, `key_concepts`, `glossary`, `questions`, `quiz`).
   - Fields: `id`, `lecture_id`, `user_id`, `output_type`, `prompt_version`, `cache_key`, `content` (JSONB), `model_name`, `token_usage`, `created_at`, `updated_at`.
   - Constraints: `UNIQUE(user_id, cache_key)` to allow user-scoped deterministic caching.

6. **`usage_events`**
   - Granular event logs for audio processing seconds and LLM token usage with cost estimation.
   - Fields: `id`, `user_id`, `lecture_id`, `event_type`, `quantity`, `estimated_cost_usd`, `metadata`, `created_at`.

7. **`reference_transcripts`**
   - Ground truth audio and reference transcripts for benchmarking.
   - Fields: `id`, `dataset_name`, `sample_name`, `audio_path`, `duration_seconds`, `ground_truth_devanagari`, `ground_truth_roman`, `technical_terms`, `consent_for_benchmark` (boolean, default false), `created_at`, `updated_at`.
   - Constraints: `UNIQUE(dataset_name, sample_name)`.

8. **`benchmark_runs`**
   - Stores empirical accuracy and performance results per model on reference samples. Starts completely empty (no fabricated numbers).
   - Fields: `id`, `reference_id`, `model_id`, `model_name`, `provider_version`, `hypothesis_transcript`, `wer`, `cer`, `technical_term_accuracy`, `code_switch_score`, `hindi_accuracy`, `english_accuracy`, `processing_time_sec`, `estimated_cost_usd`, `is_estimated`, `run_timestamp`.

---

## 2. Job State Machine & Allowed Stage Transitions

```
[uploading]
     │
     ▼
[validating]
     │
     ▼
[preparing_audio]
     │
     ▼
[transcribing]
     │
     ▼
[processing_transcript]
     │
     ▼
[generating_learning_material]
     │
     ▼
[completed]
```

### Transition Matrix

From any active stage (`uploading`, `validating`, `preparing_audio`, `transcribing`, `processing_transcript`, `generating_learning_material`), a job may transition forward to the next step, or directly to:
- `failed` (upon unrecoverable error, recording `error_code` and `error_message`)
- `cancelled` (upon user cancellation)

Terminal states (`completed`, `failed`, `cancelled`) have no outgoing transitions.
Enforced in `backend/app/models/enums.py` via `can_transition_job_stage(current, next_stage)`.

