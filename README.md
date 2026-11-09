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

## 9. Running Frontend and Backend Together

### Option A: Local Development Mode (Dev Auth)
In local development mode, no Firebase account or cloud credentials are required. Authentication runs locally with `AUTH_MODE=dev`.

1. **Start Backend**:
   ```bash
   cd backend
   source .venv/bin/activate
   # Ensure backend/.env has:
   # ENVIRONMENT=development
   # AUTH_MODE=dev
   # LLM_TIER=free (or paid if you have a Gemini API key)
   uvicorn backend.app.main:app --host 127.0.0.1 --port 8000 --reload
   ```

2. **Start Frontend**:
   ```bash
   cd frontend
   # Ensure frontend/.env.local has:
   # NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
   # NEXT_PUBLIC_USE_MOCK_API=false
   # NEXT_PUBLIC_AUTH_MODE=dev
   npm run dev
   ```

3. Open `http://localhost:3000`. You can sign in using any email to test the dev flow.

---

### Option B: Firebase Authentication Mode (Google Sign-In)
When switching to Firebase Google Sign-In:

1. **Configure Backend (`backend/.env`)**:
   ```bash
   AUTH_MODE=firebase
   FIREBASE_SERVICE_ACCOUNT_PATH=/path/to/firebase-service-account.json
   ```

2. **Configure Frontend (`frontend/.env.local`)**:
   ```bash
   NEXT_PUBLIC_AUTH_MODE=firebase
   NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSy...
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=bano-807a9.firebaseapp.com
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=bano-807a9
   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=bano-807a9.firebasestorage.app
   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=240872890224
   NEXT_PUBLIC_FIREBASE_APP_ID=1:240872890224:web:ef9052dfc5aacdc0c239b5
   NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=G-6MN46R62NS
   ```

3. Start both services. The "Continue with Google" button on `/login` and `/signup` will authenticate via Firebase and send ID tokens as `Authorization: Bearer <ID_TOKEN>` to the backend.

---

## 10. Production Deployment Checklist

### Frontend (e.g. Vercel)
- [ ] Connect repo and set Root Directory to `frontend`.
- [ ] Set environment variables in Vercel project settings:
  - `NEXT_PUBLIC_API_URL=https://api.yourdomain.com/api/v1`
  - `NEXT_PUBLIC_USE_MOCK_API=false`
  - `NEXT_PUBLIC_AUTH_MODE=firebase`
  - `NEXT_PUBLIC_FIREBASE_API_KEY`
  - `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
  - `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
  - `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
  - `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
  - `NEXT_PUBLIC_FIREBASE_APP_ID`
  - `NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID`
- [ ] In Firebase Console > Authentication > Authorized Domains, add your Vercel deployment domain (e.g. `your-app.vercel.app` and custom domain).

### Backend Host (e.g. Cloud Run / Render / VPS)
- [ ] Ensure system binaries are available: `ffmpeg`, `ffprobe`.
- [ ] Enforce production settings in environment:
  - `ENVIRONMENT=production` *(Hard blocker: backend refuses to boot if `AUTH_MODE=dev` under `ENVIRONMENT=production`)*
  - `AUTH_MODE=firebase`
  - `FIREBASE_SERVICE_ACCOUNT_PATH` (or base64 JSON credential secret)
  - `LLM_TIER=paid` *(Hard blocker: `ENVIRONMENT=production` blocks `free` LLM tier to prevent student classroom audio from training AI models)*
  - `GEMINI_API_KEY` (paid Gemini API key)
  - `GNANI_TOKEN` and `GNANI_ACCESS_KEY`
  - `DATABASE_URL` (PostgreSQL connection string with SSL)
  - `CORS_ORIGINS=["https://your-frontend-domain.com"]`
  - `APP_SECRET_KEY` (secure random string)

---

## 11. Honest Limitations

1. **YouTube Audio Scraping**: Direct downloading of arbitrary video or audio streams from YouTube URLs is not supported. The `POST /api/v1/uploads/youtube` endpoint performs SSRF validation and returns a clear `501 Not Implemented` stub. Captions or direct audio uploads must be provided.
2. **Real-time Live Streaming STT**: The transcription pipeline processes audio asynchronously via chunked batch or post-recording ingestion. Low-latency word-by-word streaming during live lectures is not supported; transcription initiates upon recording completion.
3. **Free-Tier LLM Data Privacy**: Public free-tier AI APIs (such as Gemini Free Tier) reserve contractual rights to retain and train on user prompts and audio transcripts. Bano.ai strictly blocks free-tier LLM usage in production (`ENVIRONMENT=production` requires `LLM_TIER=paid`), and only permits free-tier processing on lectures explicitly tagged as test data (`is_test_data=true`) during development.
4. **Gnani Pricing Transparency**: Gnani.ai STT pricing is subject to custom enterprise agreements and is not publicly listed on their website; cost calculations for Gnani in benchmark runs remain uncalculated unless explicitly set by the administrator.
5. **Code-Switching Ambiguity**: In colloquial Hinglish, non-standard Roman transliterations (e.g. *samajh* vs *samjh* vs *samaj*) can introduce phonetic spelling variations across different speakers. The transliteration engine uses a canonical STEM dictionary to standardize technical terms, but conversational Hindi romanization may vary.
