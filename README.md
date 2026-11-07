# Bano.ai – Lecture Intelligence Platform

Bano.ai is an intelligent audio-first lecture processing and study platform specifically engineered for Indian higher education and coaching ecosystems. It processes mixed Hinglish (Hindi + English) classroom audio into dual-script transcripts (Devanagari & Roman), performs academic segment classification, and generates structured study materials (executive summaries, lecture notes, key concepts, glossaries, practice questions, and announcements).

---

## Architecture Overview

```
                      ┌──────────────────────┐
                      │    FastAPI Backend   │
                      │       (/api/v1)      │
                      └──────────┬───────────┘
                                 │
         ┌───────────────────────┼────────────────────────┐
         │                       │                        │
         ▼                       ▼                        ▼
┌──────────────────┐   ┌──────────────────┐     ┌──────────────────┐
│    Audio Prep    │   │     Gnani STT    │     │   Gemini / LLM   │
│ (FFmpeg/FFprobe) │   │   (Vachana v3)   │     │    Extraction    │
└──────────────────┘   └──────────────────┘     └──────────────────┘
         │                       │                        │
         └───────────────────────┼────────────────────────┘
                                 ▼
                     ┌──────────────────────┐
                     │ PostgreSQL Database  │
                     │  (SQLAlchemy+Alembic)│
                     └──────────────────────┘
```

---

## 1. Setup

### Prerequisites
- Python 3.11+ (tested on Python 3.11, 3.12, 3.14)
- Docker & Docker Compose (for PostgreSQL)
- `ffmpeg` and `ffprobe` installed on system path:
  ```bash
  # macOS
  brew install ffmpeg

  # Ubuntu/Debian
  sudo apt-get update && sudo apt-get install -y ffmpeg
  ```

### Backend Virtual Environment
```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

---

## 2. Environment Variables

Copy the example environment configuration:
```bash
cp .env.example backend/.env
```

Key environment configurations:
| Variable | Description | Default / Example |
|---|---|---|
| `ENVIRONMENT` | Runtime environment (`development`, `test`, `production`) | `development` |
| `AUTH_MODE` | Authentication mode (`dev` for mock, `firebase` for JWT) | `dev` |
| `DATABASE_URL` | SQLAlchemy PostgreSQL connection string | `postgresql+psycopg2://bano_user:bano_password@localhost:5432/bano_db` |
| `TEST_DATABASE_URL` | Fast in-memory SQLite database for unit tests | `sqlite:///:memory:` |
| `GNANI_API_KEY` | Gnani.ai STT API key | *Secret* |
| `GNANI_BASE_URL` | Gnani REST & Batch endpoint | `https://api.vachana.ai` |
| `LLM_PROVIDER` | Primary extraction LLM (`gemini` or `openai`) | `gemini` |
| `LLM_TIER` | Privacy tier (`free` for eval test data; `paid` for users) | `free` |
| `GEMINI_DEFAULT_MODEL`| Default Gemini model | `gemini-3.1-flash-lite` |
| `GEMINI_API_KEY` | Google Gemini API key | *Secret* |
| `STORAGE_BACKEND` | Audio object storage adapter (`local`, `gcs`, `s3`) | `local` |
| `LOCAL_STORAGE_DIR` | Disk path for audio files when using local storage | `/tmp/bano_storage` |

---

## 3. Docker Compose

Start the PostgreSQL 16 database container:
```bash
docker compose up -d postgres
```

Stop the database container:
```bash
docker compose down
```

---

## 4. Database Migrations

Database schemas are versioned and managed using Alembic.

To run migrations to the latest revision:
```bash
cd backend
source .venv/bin/activate
alembic upgrade head
```

To create a new migration:
```bash
alembic revision -m "description_of_change"
```

To rollback the last migration:
```bash
alembic downgrade -1
```

---

## 5. Running the Backend Server

```bash
cd backend
source .venv/bin/activate
uvicorn backend.app.main:app --host 0.0.0.0 --port 8000 --reload
```

Interactive API documentation will be available at:
- Swagger UI: `http://localhost:8000/api/v1/docs`
- ReDoc: `http://localhost:8000/api/v1/redoc`

---

## 6. Running Tests

The test suite contains unit, integration, and security verification tests.

### Run All Unit & Security Tests (Mocked / Offline)
```bash
source backend/.venv/bin/activate
PYTHONPATH=. pytest backend/tests -m "not real_api"
```

### Run Specific Test Suites
```bash
# Auth, IDOR & lecture CRUD tests
PYTHONPATH=. pytest backend/tests/test_auth_and_lectures.py

# Export & Security verification tests
PYTHONPATH=. pytest backend/tests/test_export_and_security.py

# LLM pipeline & structured extraction tests
PYTHONPATH=. pytest backend/tests/test_llm_pipeline.py -m "not real_api"

# Audio transliteration & lexicon tests
PYTHONPATH=. pytest backend/tests/test_transliteration.py

# Benchmark evaluation tests
PYTHONPATH=. pytest backend/tests/test_benchmarking.py
```

### Run Live End-to-End External API Tests
*(Requires valid `GEMINI_API_KEY` and network access)*
```bash
PYTHONPATH=. pytest backend/tests/test_llm_pipeline.py -m "real_api" -s
```

---

## 7. Running Benchmarks

Bano.ai features a reproducible benchmarking framework that evaluates speech-to-text models on real classroom audio clips across WER (Word Error Rate), CER (Character Error Rate), Romanized WER/CER, technical term accuracy, and latency.

### Run Evaluation CLI
```bash
source backend/.venv/bin/activate

# Benchmark Gnani Vachana v3
python scripts/run_benchmarks.py --providers gnani

# Benchmark Faster Whisper local model
python scripts/run_benchmarks.py --providers faster_whisper

# Benchmark multiple providers and output to CSV
python scripts/run_benchmarks.py --providers gnani,faster_whisper --output-csv backend/benchmark_data/benchmark_results.csv
```

### Query Benchmark Results
Aggregated empirical results are queryable via the public API:
```bash
curl http://localhost:8000/api/v1/benchmark/results
curl http://localhost:8000/api/v1/benchmark/details
```

---

## 8. Exporting Lecture Materials

Download synthesized study materials (notes, summary, glossary, practice questions, announcements, and dual transcripts) as a clean Markdown document:

```bash
curl -H "Authorization: Bearer <TOKEN>" \
  "http://localhost:8000/api/v1/lectures/{lecture_id}/export?format=md" \
  -o lecture_notes.md
```

All AI-generated sections are explicitly badged with AI attribution disclaimers. Access is strictly owner-only.

---

## 9. Honest Limitations

1. **YouTube Audio Scraping**: Direct downloading of arbitrary video or audio streams from YouTube URLs is not supported. The `POST /api/v1/uploads/youtube` endpoint performs SSRF validation and returns a clear `501 Not Implemented` stub. Captions or direct audio uploads must be provided.
2. **Real-time Live Streaming STT**: The transcription pipeline processes audio asynchronously via chunked batch or post-recording ingestion. Low-latency word-by-word streaming during live lectures is not supported; transcription initiates upon recording completion.
3. **Free-Tier LLM Data Privacy**: Public free-tier AI APIs (such as Gemini Free Tier) reserve contractual rights to retain and train on user prompts and audio transcripts. Bano.ai strictly blocks free-tier LLM usage in production (`ENVIRONMENT=production` requires `LLM_TIER=paid`), and only permits free-tier processing on lectures explicitly tagged as test data (`is_test_data=true`) during development.
4. **Gnani Pricing Transparency**: Gnani.ai STT pricing is subject to custom enterprise agreements and is not publicly listed on their website; cost calculations for Gnani in benchmark runs remain uncalculated unless explicitly set by the administrator.
5. **Code-Switching Ambiguity**: In colloquial Hinglish, non-standard Roman transliterations (e.g. *samajh* vs *samjh* vs *samaj*) can introduce phonetic spelling variations across different speakers. The transliteration engine uses a canonical STEM dictionary to standardize technical terms, but conversational Hindi romanization may vary.
