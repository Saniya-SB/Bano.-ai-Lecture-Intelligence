# Phase 0 Feasibility Study: Gnani STT & Frontend Expectations

**Project:** Bano.ai – Lecture Intelligence  
**Role:** Backend & AI Engineering Lead Support  
**Date:** November 2026  
**Status:** Verification Completed (Pending Human Approval)

---

## 1. Frontend Expectations (from `frontend/src`)

An inspection of `frontend/src` was performed in read-only mode.

### 1.1 Expected API Endpoints & Methods

| Service | Method | Endpoint Path | Expected Request Payload / Params | Expected Response Type |
| :--- | :--- | :--- | :--- | :--- |
| **Auth** | `GET` | `/users/me` | None (Auth Header) | `UserDto` (`id`, `email`, `full_name`, `created_at`, `updated_at`) |
| **Auth** | `POST` | `/auth/login` | `{ email, password, rememberMe? }` | `UserDto` |
| **Auth** | `POST` | `/auth/signup` | `{ full_name, email, password }` | `UserDto` |
| **Auth** | `POST` | `/auth/logout` | None | `void` (204 or empty response) |
| **Lectures** | `GET` | `/lectures` | None | `LectureDto[]` |
| **Lectures** | `GET` | `/lectures/{id}` | Path param `id` | `LectureDto` |
| **Lectures** | `POST` | `/lectures` | `{ title, subject, topic? }` | `LectureDto` |
| **Lectures** | `PATCH` | `/lectures/{id}` | `{ title }` | `LectureDto` |
| **Lectures** | `DELETE` | `/lectures/{id}` | Path param `id` | `void` (204) |
| **Transcripts** | `GET` | `/lectures/{lectureId}/transcripts` | Path param `lectureId` | `TranscriptDto` (details below) |
| **Jobs** | `GET` | `/jobs/{lectureId}` | Path param `lectureId` | `JobDto` (details below) |
| **Uploads** | `POST` | `/uploads/initiate` | `{ file_name, mime_type, file_size }` | `{ uploadId: string, uploadUrl?: string }` |
| **Uploads** | `POST` | `/uploads/complete` | `{ upload_id }` | `{ success: boolean }` |
| **Benchmark** | `GET` | `/benchmark/results` | None | `BenchmarkModelResultDto[]` |

*Note: Base URL defaults to `http://localhost:8000/api/v1` via `NEXT_PUBLIC_API_BASE_URL` in `frontend/src/config/env.ts`.*

---

### 1.2 TypeScript Interfaces / DTOs (`frontend/src/types/api/common.ts` & services)

#### Lecture & Status
```typescript
type LectureStatusDto = "uploaded" | "processing" | "transcribing" | "generating_notes" | "completed" | "failed";

interface LectureDto {
  id: string;
  title: string;
  subject: string;
  topic?: string;
  duration_seconds: number;
  status: LectureStatusDto;
  created_at: string; // ISO 8601
  updated_at: string;
}
```

#### Job & Stages
```typescript
type JobStageDto =
  | "uploading"
  | "validating"
  | "preparing_audio"
  | "transcribing"
  | "processing_transcript"
  | "generating_learning_material"
  | "completed"
  | "failed";

interface JobDto {
  id: string;
  lecture_id: string;
  stage: JobStageDto;
  progress_percent?: number;
  error_message?: string;
  created_at: string;
  updated_at: string;
}
```

#### Transcript
```typescript
interface TranscriptSegmentDto {
  id: string;
  start_time: number;
  end_time: number;
  text: string;
}

interface TranscriptDto {
  id: string;
  lecture_id: string;
  roman_segments: TranscriptSegmentDto[];
  devanagari_segments: TranscriptSegmentDto[];
}
```

#### Benchmark Results
```typescript
interface BenchmarkModelResultDto {
  model_id: string;
  model_name: string;
  wer: number;
  cer: number;
  technical_term_accuracy: number;
  processing_time_sec: number;
  estimated_cost_usd: number;
  is_estimated: boolean;
}
```

#### Error Response DTO
```typescript
interface ApiErrorDto {
  detail?: string | { msg?: string; type?: string; loc?: (string | number)[] }[];
  message?: string;
  code?: string;
  field_errors?: Record<string, string>;
  request_id?: string;
}
```
*Note: The frontend `apiClient` explicitly expects FastAPI's standard 422 schema format (`detail: [{loc: [...], msg: "..."}]`) for field-level validation errors.*

---

### 1.3 Auth Method & Current State

- **Current Frontend Mode:** The frontend is configured with `NEXT_PUBLIC_USE_MOCK_API=true` by default in `frontend/src/config/env.ts`.
- When `USE_MOCK_API=true`, `auth-service.ts` uses local in-memory storage (`mockStore`) and returns mock credentials (`usr_mock_1`, "Aman Sharma").
- When `USE_MOCK_API=false`, calls go to `/auth/login`, `/auth/signup`, and `/users/me`.
- **Backend Requirement:** As per your constraints, backend will support `AUTH_MODE=dev|firebase`. Under `AUTH_MODE=dev`, we will provide mock-friendly auth tokens or a dev header to allow seamless integration without requiring active Firebase tokens.

---

### 1.4 Upload Flow Expectations

In `frontend/src/services/upload-service.ts`:
1. Frontend calls `POST /uploads/initiate` passing `{ file_name, mime_type, file_size }`.
2. Backend responds with `{ uploadId: string, uploadUrl?: string }`.
3. If `uploadUrl` is present (presigned URL for S3/Supabase Storage), frontend uploads directly or sends file chunks.
4. Frontend calls `POST /uploads/complete` passing `{ upload_id }`.
5. Frontend route `lectures/new/page.tsx` is currently an M1 route skeleton and will wire this in milestone M4.

---

## 2. Official Gnani Documentation Findings

Verified directly against official Gnani documentation sources (`llms.txt`, `prisma-v3.md`, `Introduction.md` [Batch], `speech-to-text.md` [REST], and `speech-to-text-batch.md` [Python SDK]).

### 2.1 Verified Endpoints & Base URLs
- **Base URL:** `https://api.vachana.ai`  
  *(Source: [docs.gnani.ai/api/STTBatch/Introduction.md](https://docs.gnani.ai/api/STTBatch/Introduction.md))*
- **REST Transcription:**  
  `POST https://api.vachana.ai/stt/v3`  
  *(Source: [docs.gnani.ai/api/STT/speech-to-text.md](https://docs.gnani.ai/api/STT/speech-to-text.md))*
- **Batch Transcription Endpoints:**  
  1. Create Job: `POST /stt/v3/batch/jobs` (or `POST /stt/v3/batch/v2/jobs` for presigned uploads >10MB)  
  2. Start Job: `POST /stt/v3/batch/jobs/{job_id}/start`  
  3. Status / Polling: `GET /stt/v3/batch/jobs/{job_id}`  
  4. File Results: `GET /stt/v3/batch/jobs/{job_id}/files`  
  5. List Jobs: `GET /stt/v3/batch/jobs`  
  6. Cancel Job: `POST /stt/v3/batch/jobs/{job_id}/cancel`  
  *(Source: [docs.gnani.ai/api/STTBatch/Introduction.md](https://docs.gnani.ai/api/STTBatch/Introduction.md))*

### 2.2 Authentication Header
- Header Name: `X-API-Key-ID`
- Value: `<GNANI_API_KEY>` (obtained from the Gnani APIs dashboard)
- Optional Header: `X-API-Request-ID` (client correlation ID, echoed in response)  
  *(Sources: [docs.gnani.ai/api/STT/speech-to-text.md](https://docs.gnani.ai/api/STT/speech-to-text.md), [docs.gnani.ai/api/STTBatch/Introduction.md](https://docs.gnani.ai/api/STTBatch/Introduction.md))*

### 2.3 Parameters & Formats

#### REST Parameters (`multipart/form-data`)
- `audio_file`: binary file (required)
- `model`: string, pass `prisma-v3.0` (default is `prisma-v2.5` if omitted)
- `language_code`: string, pass `hi-IN,en-IN` or `indic-auto` (up to 4 comma-separated languages for Prisma v3.0)
- `format`: enum (`verbatim`, `transcribe`, `codemix`, `transliterate`).
- Context hints: `keyterms` (up to 200 items), `topic` (up to 1,600 chars), `previous_text` (up to 600 chars), `speaker_names` (1–4 names).  
  *(Source: [docs.gnani.ai/api/STT/speech-to-text.md](https://docs.gnani.ai/api/STT/speech-to-text.md))*

#### Batch Parameters (`config` object)
- `model`: string, required (`prisma-v3.0` or `prisma-v2.5`)
- `language_code`: string, 1 to 4 codes or `"auto"`
- `format`: `verbatim`, `transcribe`, or `codemix` (Note: see Batch support below)
- Context hints: `keyterms`, `topic` (min 30 chars on Batch, max 1,600), `speaker_names`.  
  *(Source: [docs.gnani.ai/api/STTBatch/Introduction.md](https://docs.gnani.ai/api/STTBatch/Introduction.md))*

#### Supported Audio Formats
- REST: WAV, MP3, OGG, FLAC, AAC, M4A.
- Batch: WAV, MP3, MP4, FLAC, OGG, OPUS, M4A, AAC, WEBM, AMR, or ZIP.  
  *(Sources: [docs.gnani.ai/api/STT/speech-to-text.md](https://docs.gnani.ai/api/STT/speech-to-text.md), [docs.gnani.ai/python-sdk/speech-to-text-batch.md](https://docs.gnani.ai/python-sdk/speech-to-text-batch.md))*

### 2.4 File Duration & Size Limits
- **REST Duration Limit:** Max **30 seconds** per request.  
  *(Source: [docs.gnani.ai/api/STT/models/prisma-v3.md](https://docs.gnani.ai/api/STT/models/prisma-v3.md#quick-facts))*
- **Batch Size Limits:**
  - Direct multipart upload: Max **10 MB** per audio file.
  - Large file upload via presigned URL (`POST /stt/v3/batch/v2/jobs`): For files >10 MB.
  - Files per job: 100 files; ZIP archive max 50 MB compressed.  
  *(Sources: [docs.gnani.ai/python-sdk/speech-to-text-batch.md](https://docs.gnani.ai/python-sdk/speech-to-text-batch.md), [docs.gnani.ai/api/STTBatch/Create_Job.md](https://docs.gnani.ai/api/STTBatch/Create_Job.md))*

### 2.5 Critical Finding: Batch Support for `codemix` and `transliterate`
Verified from the official Prisma v3.0 model matrix and Batch docs:
- **`codemix` support:** Supported across **REST, Realtime, and Batch** (`config.format = "codemix"` with `model: "prisma-v3.0"`). Keeps English words in Latin script while Hindi words are in Devanagari.
- **`transliterate` support:** Supported on **REST and Realtime only**.
  - Direct quote from official doc:  
    > `verbatim`, `transcribe` and `codemix` (REST, Realtime and Batch), and `transliterate` (REST and Realtime)  
    *(Source: [docs.gnani.ai/api/STT/models/prisma-v3.md](https://docs.gnani.ai/api/STT/models/prisma-v3.md#differences-from-prisma-v2-5))*
- **Architectural Implication:** Long lectures processed through Batch STT can directly yield Devanagari Hinglish (`codemix`). However, Roman Hinglish transcripts cannot be obtained directly from Gnani Batch via `format=transliterate`. Roman transliteration must be generated via our dedicated transliteration pipeline (or chunked REST/LLM transliteration).

---

## 3. Feasibility Script

The test script has been created at [scripts/feasibility_gnani.py](file:///Users/amantullakhan/Documents/GitHub/Bano.-ai-Lecture-Intelligence/scripts/feasibility_gnani.py).
- Sends `POST https://api.vachana.ai/stt/v3` with `X-API-Key-ID: GNANI_API_KEY`.
- Uses multipart form payload specifying `model=prisma-v3.0`, `language_code=hi-IN,en-IN`, `format=codemix`.
- Saves the full raw response or error JSON to `docs/gnani_feasibility_response.json`.

---

## 4. Open Questions & Required Human Actions

### 4.1 Manual Actions Required by Lead
1. **Provide `GNANI_API_KEY`:** Add `GNANI_API_KEY=<your-key>` to `.env` or `backend/.env` (or provide via environment).
2. **Provide Test Audio Sample:** Place a short (<30s) real technical Hinglish lecture audio clip (e.g. `sample_hinglish.wav`) in project root or `scripts/`, or pass its path to `python scripts/feasibility_gnani.py <path>`.

### 4.2 Key Architectural Decisions (Category B / C) for Approval
1. **Roman Transliteration Strategy for Long Lectures:** Since Gnani Batch STT does not support `transliterate`, should we use an open-source transliteration library (e.g., `indic-transliteration` / `ai4bharat`), or use our LLM service during the material generation phase to derive the Roman transcript from the `codemix` Devanagari transcript?
2. **Audio Ingestion Chunking vs Batch API:** For lectures under 10MB vs larger files, do we standardize on Batch STT with presigned URLs or chunk audio via FFmpeg to REST STT? (Batch is recommended by Gnani for long audio).

