# Bano.ai Lecture Intelligence - API Contract

> **Target Audience**: Frontend Engineering Team  
> **API Version**: `0.1.0`  
> **Base Prefix**: `/api/v1`  
> **Interactive Documentation**: Available at `/api/v1/docs` (Swagger UI) and `/api/v1/redoc` (ReDoc) when running the server.

---

## 1. Authentication & Headers

Requests must provide the standard HTTP `Authorization` header:

```http
Authorization: Bearer <TOKEN>
```

### Dev Mode (`AUTH_MODE=dev`)
In development, any mock token or JSON string can be supplied.
```http
Authorization: Bearer {"id": "usr_dev_1", "email": "student@bano.ai", "full_name": "Dev Student"}
```
If omitted or `Bearer dev`, defaults to configured `DEV_MOCK_USER_ID`.

### Production Mode (`AUTH_MODE=firebase`)
In production, `<TOKEN>` must be a valid, unexpired Firebase ID Token verified via Firebase Admin SDK.
> **Note**: `AUTH_MODE=dev` is strictly refused and forbidden when `ENVIRONMENT=production`.

### Tracing Header
Every response echoes an `X-Request-ID` header (and accepts custom incoming `X-Request-ID`).

---

## 2. Standard Error Format

All error responses adhere to `UnifiedErrorResponse`:

```json
{
  "message": "Error description for UI display",
  "code": "ERROR_CODE_STRING",
  "detail": "Error description or array of validation errors",
  "field_errors": {
    "field_name": "Field-specific validation error message"
  },
  "request_id": "c1f77d44-0b13-4416-8968-07cb121ec3c5"
}
```

### Standard Status Codes
- `200 OK` / `201 Created` / `204 No Content`
- `400 Bad Request`: Validation failure, invalid export format, or duration out of range.
- `401 Unauthorized`: Missing or invalid Bearer token.
- `403 Forbidden`: Privacy guard violation (e.g. non-test data under `LLM_TIER=free`).
- `404 Not Found`: Entity not found or access denied (IDOR protection prevents leaking existence of other users' resources).
- `409 Conflict`: Duplicate upload detected via per-user SHA-256 hash.
- `422 Unprocessable Content`: Pydantic payload validation error.
- `501 Not Implemented`: YouTube audio scraping stub (authorized captions only).
- `502 Bad Gateway`: Downstream STT or LLM communication failure.

---

## 3. Endpoints

### 3.1 Health
#### `GET /api/v1/health`
Returns system health status.
- **Auth**: None required.
- **Response `200 OK`**:
```json
{
  "status": "healthy",
  "environment": "development",
  "version": "0.1.0"
}
```

---

### 3.2 User Profile
#### `GET /api/v1/users/me`
Fetches the authenticated user profile.
- **Auth**: Required.
- **Response `200 OK`**:
```json
{
  "id": "usr_dev_1",
  "email": "student@bano.ai",
  "full_name": "Dev Student",
  "created_at": "2026-11-07T12:00:00Z",
  "updated_at": "2026-11-07T12:00:00Z"
}
```

---

### 3.3 Lectures Management

#### `POST /api/v1/lectures`
Creates a new lecture record.
- **Auth**: Required.
- **Request Body**:
```json
{
  "title": "Computer Networks - TCP 3-Way Handshake",
  "subject": "Computer Science",
  "topic": "Transport Layer",
  "is_test_data": false
}
```
> **Security Notice**: `is_test_data` is only honored in dev/test environments. In `ENVIRONMENT=production`, client requests attempting to set `is_test_data=true` are automatically stripped and forced to `false`.

- **Response `201 Created`**:
```json
{
  "id": "lec_a1b2c3d4e5f6",
  "title": "Computer Networks - TCP 3-Way Handshake",
  "subject": "Computer Science",
  "topic": "Transport Layer",
  "duration_seconds": 0,
  "status": "uploaded",
  "is_test_data": false,
  "created_at": "2026-11-07T12:00:00Z",
  "updated_at": "2026-11-07T12:00:00Z"
}
```

#### `GET /api/v1/lectures`
Lists all lectures belonging to the authenticated user.
- **Auth**: Required (Owner only).
- **Response `200 OK`**: Array of `LectureResponse` objects.

#### `GET /api/v1/lectures/{lecture_id}`
Retrieves details of a specific lecture.
- **Auth**: Required.
- **Security**: Returns `404 Not Found` if the lecture does not belong to the caller.
- **Response `200 OK`**: `LectureResponse` object.

#### `PATCH /api/v1/lectures/{lecture_id}`
Updates metadata (title, subject, topic) of a lecture.
- **Auth**: Required (Owner only).
- **Request Body**:
```json
{
  "title": "Computer Networks - TCP & UDP Comparison",
  "subject": "Computer Science",
  "topic": "Transport Layer"
}
```
- **Response `200 OK`**: Updated `LectureResponse` object.

#### `DELETE /api/v1/lectures/{lecture_id}`
Deletes a lecture and all its transcripts, jobs, and generated outputs.
- **Auth**: Required (Owner only).
- **Response `204 No Content`**.

---

### 3.4 Transcripts & Segment Classification

#### `GET /api/v1/lectures/{lecture_id}/transcripts`
Retrieves dual Devanagari (Hindi) and Roman (Hinglish) transcripts with segment classifications.
- **Auth**: Required (Owner only).
- **Response `200 OK`**:
```json
{
  "id": "tr_lec_a1b2c3d4e5f6",
  "lecture_id": "lec_a1b2c3d4e5f6",
  "devanagari_segments": [
    {
      "id": "seg_d1",
      "start_time": 0.0,
      "end_time": 8.5,
      "text": "आज हम बाइनरी सर्च ट्री के बेसिक्स समझेंगे।",
      "segment_type": "concept"
    },
    {
      "id": "seg_d2",
      "start_time": 8.5,
      "end_time": 15.0,
      "text": "असाइनमेंट सबमिशन की लास्ट डेट शुक्रवार शाम 5 बजे है।",
      "segment_type": "admin"
    }
  ],
  "roman_segments": [
    {
      "id": "seg_r1",
      "start_time": 0.0,
      "end_time": 8.5,
      "text": "aaj ham binary search tree ke basics samjhenge.",
      "segment_type": "concept"
    },
    {
      "id": "seg_r2",
      "start_time": 8.5,
      "end_time": 15.0,
      "text": "assignment submission ki last date shukrawar shaam 5 baje hai.",
      "segment_type": "admin"
    }
  ]
}
```
> **Segment Types**:
> - `concept`: Core academic lecture content.
> - `example`: Explanatory examples, code snippets, or analogies.
> - `admin`: Teacher announcements, deadlines, exam dates.
> - `off_topic`: Casual chit-chat, attendance rolls, interruptions. Never delete; style subtly in UI.

---

### 3.5 Learning Materials (AI Outputs)

#### `GET /api/v1/lectures/{lecture_id}/materials`
*(Also available at `GET /api/v1/lectures/{lecture_id}/outputs`)*
Returns synthesized AI study materials for the lecture.
- **Auth**: Required (Owner only).
- **Response `200 OK`**:
```json
{
  "lecture_id": "lec_a1b2c3d4e5f6",
  "is_ai_generated": true,
  "disclaimer": "This content is AI-generated from the lecture audio transcript. It reflects synthesized study material and is never a teacher quote.",
  "prompt_version": "v1.0",
  "model_name": "gemini-3.1-flash-lite",
  "cache_hit": true,
  "token_usage": {
    "prompt_tokens": 1420,
    "completion_tokens": 680,
    "total_tokens": 2100,
    "estimated_cost_usd": 0.001375
  },
  "summary": {
    "short": "2-3 sentence executive summary of the lecture.",
    "detailed": "Comprehensive multi-paragraph synthesis of principles covered."
  },
  "notes": [
    {
      "heading": "Binary Search Tree Properties",
      "bullet_points": [
        "Left subtree keys are strictly smaller than the node key.",
        "Right subtree keys are strictly greater than the node key."
      ],
      "referenced_segment_ids": ["seg_r1"],
      "referenced_time_ranges": [{"start": 0.0, "end": 8.5}]
    }
  ],
  "key_concepts": [
    {
      "concept": "Binary Search Tree (BST)",
      "explanation": "Node-based hierarchical binary tree data structure with logarithmic average lookup time.",
      "referenced_segment_ids": ["seg_r1"],
      "referenced_time_ranges": [{"start": 0.0, "end": 8.5}]
    }
  ],
  "glossary": [
    {
      "term": "BST",
      "definition": "Binary Search Tree",
      "referenced_time_ranges": [{"start": 0.0, "end": 8.5}]
    }
  ],
  "important_questions": [
    {
      "question": "What is the worst-case lookup time in an unbalanced BST?",
      "suggested_answer": "O(N) when nodes are inserted in sorted order, creating a degenerate line.",
      "referenced_time_ranges": [{"start": 0.0, "end": 8.5}]
    }
  ],
  "announcements": [
    {
      "text": "Assignment submission deadline is Friday 5:00 PM.",
      "referenced_time_ranges": [{"start": 8.5, "end": 15.0}]
    }
  ]
}
```

---

### 3.6 Lecture Export

#### `GET /api/v1/lectures/{lecture_id}/export?format=md`
Downloads a formatted Markdown file containing complete dual transcripts, notes, executive and detailed summaries, glossary, practice questions, and teacher announcements.
- **Auth**: Required (Owner only; `404` if not found or unauthorized).
- **Query Parameter**: `format=md` (strictly required; other formats return `400 Bad Request`).
- **Response `200 OK`**:
  - `Content-Type: text/markdown; charset=utf-8`
  - `Content-Disposition: attachment; filename="<slugified_title>_export.md"`
  - Body: Plaintext Markdown document with clear AI attribution banners.

---

### 3.7 Quizzes

#### `GET /api/v1/lectures/{lecture_id}/quiz`
Retrieves existing quiz if already generated for this lecture.
- **Auth**: Required (Owner only).
- **Response `200 OK`**: `QuizPayload` (see schema below).

#### `POST /api/v1/lectures/{lecture_id}/quiz?num_questions=5`
Generates an on-demand multiple choice quiz grounded strictly in the lecture concepts.
- **Auth**: Required (Owner only).
- **Query Parameter**: `num_questions` (integer between 1 and 15, default 5).
- **Response `200 OK`**:
```json
{
  "lecture_id": "lec_a1b2c3d4e5f6",
  "is_ai_generated": true,
  "disclaimer": "This quiz is AI-generated from the lecture audio transcript. It reflects synthesized assessment items and is never a teacher quote.",
  "model_name": "gemini-3.1-flash-lite",
  "token_usage": {
    "prompt_tokens": 1100,
    "completion_tokens": 400,
    "total_tokens": 1500,
    "estimated_cost_usd": 0.000875
  },
  "questions": [
    {
      "id": "q1",
      "question": "What is the average time complexity of searching a node in a balanced BST?",
      "options": ["O(1)", "O(log N)", "O(N)", "O(N log N)"],
      "correct_option_index": 1,
      "explanation": "Balanced trees halve the search space at each depth level, yielding O(log N).",
      "referenced_segment_ids": ["seg_r1"],
      "referenced_time_ranges": [{"start": 0.0, "end": 8.5}]
    }
  ]
}
```

---

### 3.8 Audio Upload & Pipeline Ingestion

#### `POST /api/v1/uploads/initiate`
Initiates a chunked/direct upload session.
- **Auth**: Required.
- **Request Body**:
```json
{
  "file_name": "lecture_audio.mp3",
  "mime_type": "audio/mpeg",
  "file_size": 25165824,
  "title": "Database Systems - Indexing",
  "subject": "CS",
  "topic": "B+ Trees"
}
```
- **Response `200 OK`**:
```json
{
  "uploadId": "upl_9e4726bf...",
  "uploadUrl": "/api/v1/uploads/upl_9e4726bf.../binary"
}
```

#### `PUT` or `POST /api/v1/uploads/{upload_id}/binary`
Receives the multipart audio file payload for the upload session.
- **Auth**: Required (caller must match the user who initiated the upload).

#### `POST /api/v1/uploads/complete`
Finalizes the upload, performs SHA-256 duplicate validation, and enqueues transcription pipeline.
- **Auth**: Required (Owner only).
- **Request Body**:
```json
{
  "upload_id": "upl_9e4726bf..."
}
```
- **Response `200 OK`**:
```json
{
  "success": true,
  "lecture_id": "lec_a1b2c3d4e5f6",
  "job_id": "job_018f3a..."
}
```

#### `POST /api/v1/uploads/direct`
Direct single-request multipart upload for live in-browser mic recordings or drag-and-drop audio.
- **Auth**: Required.
- **Form Data**:
  - `file`: Audio file binary (MP3, WAV, M4A, WEBM, MP4)
  - `title`: Optional lecture title
  - `subject`: Optional subject (defaults to "General")
  - `topic`: Optional topic
  - `source_type`: `"upload"` or `"recording"`
- **Response `200 OK`**:
```json
{
  "lecture_id": "lec_a1b2c3d4e5f6",
  "job_id": "job_018f3a...",
  "status": "processing"
}
```

#### `POST /api/v1/uploads/youtube`
Validates YouTube link and checks SSRF safety.
- **Status**: Returns `501 Not Implemented` with explanation. Arbitrary video/audio stream downloading is disabled.

---

### 3.9 Transcription Jobs

#### `GET /api/v1/jobs/{identifier}`
Polls job processing progress by either Job ID (`job_...`) or Lecture ID (`lec_...`).
- **Auth**: Required (Owner only; returns `404` if not found or owned).
- **Response `200 OK`**:
```json
{
  "id": "job_018f3a...",
  "lecture_id": "lec_a1b2c3d4e5f6",
  "stage": "processing_transcript",
  "progress_percent": 75,
  "error_message": null,
  "created_at": "2026-11-07T12:00:00Z",
  "updated_at": "2026-11-07T12:00:15Z"
}
```
> **Job Stages**: `uploading` -> `validating` -> `preparing_audio` -> `transcribing` -> `processing_transcript` -> `generating_learning_material` -> `completed` (or `failed`).

---

### 3.10 STT Benchmark Evaluation

#### `GET /api/v1/benchmark/results` *(Also at `/benchmark/results`)*
Returns empirical, measured benchmark evaluation metrics per speech-to-text model.
- **Auth**: None required (public benchmark leaderboard).
- **Response `200 OK`**:
```json
[
  {
    "model_id": "gnani_vachana",
    "model_name": "Gnani.ai Vachana v3",
    "wer": 0.142,
    "cer": 0.081,
    "wer_roman": 0.165,
    "cer_roman": 0.095,
    "technical_term_accuracy": 0.945,
    "mean_latency": 4.12,
    "min_latency": 3.80,
    "max_latency": 4.55,
    "total_cost": 0.0,
    "is_estimated": false,
    "source": "empirical",
    "license": "Commercial SaaS"
  }
]
```

#### `GET /api/v1/benchmark/details` *(Also at `/benchmark/details`)*
Returns granular clip-by-clip benchmark evaluation data.
- **Auth**: None required.

