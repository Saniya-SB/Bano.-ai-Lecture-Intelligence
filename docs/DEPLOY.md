# Production Deployment Checklist

This document outlines the mandatory production configuration, security verifications, and operational procedures for deploying **Bano.ai Lecture Intelligence**.

---

## 1. Environment & Auth Configuration

- [ ] **Set `ENVIRONMENT=production`**
  - Disables dev/mock bypasses.
  - Automatically suppresses client-driven `is_test_data` overrides on lectures.
  - Returns sanitized error messages for internal failures.

- [ ] **Set `AUTH_MODE=firebase`**
  - Requires genuine, cryptographically signed Firebase ID tokens in the `Authorization: Bearer <TOKEN>` header.
  - Refuses to start if `AUTH_MODE=dev` is configured alongside `ENVIRONMENT=production`.

- [ ] **Mount Firebase Service Account Credentials**
  - Set `FIREBASE_CREDENTIALS_PATH=/etc/secrets/firebase-service-account.json`.
  - Ensure the service account file is mounted read-only and restricted (`chmod 600`) to the application user.

- [ ] **Set `LLM_TIER=paid` for Real Users**
  - **Critical User Privacy Requirement**: Free-tier model endpoints reserve rights to train on user prompts and audio transcriptions.
  - In production, all real student and teacher data **must** use `LLM_TIER=paid` to guarantee enterprise zero-data-retention and zero-model-training compliance.
  - The application strictly refuses to start or process production requests under `LLM_TIER=free`.

---

## 2. Secrets & Key Rotation

- [ ] **Provision Dedicated API Keys**
  - `GEMINI_API_KEY`: Generate a production API key from Google Cloud Console / AI Studio with billing enabled.
  - `GNANI_API_KEY`: Production STT credential from Gnani.ai.
  - `OPENAI_API_KEY`: (Optional) If running secondary OpenAI provider models.

- [ ] **Key Rotation Schedule**
  - Establish a 90-day rotation cadence for LLM and STT API keys.
  - In Google Cloud Console, generate the replacement API key and deploy via environment secrets before revoking the retired key.
  - Rotate database password and update `DATABASE_URL` via orchestrated zero-downtime secret rollout.

- [ ] **Never Commit Secrets**
  - Verify `.env` is ignored by `.gitignore`.
  - Use cloud secret managers (AWS Secrets Manager, Google Secret Manager, or Kubernetes Secrets) to inject environment variables at runtime.

---

## 3. Database & Migrations

- [ ] **Provision Production PostgreSQL**
  - PostgreSQL 15+ instance with SSL connection enforcement (`sslmode=require`).
  - Configure connection pool sizing (default SQLAlchemy pool size: 20 connections, max overflow: 10).

- [ ] **Execute Migrations**
  ```bash
  cd backend
  alembic upgrade head
  ```
  - Verify all migrations (`001_initial_schema` through latest) have applied successfully.

---

## 4. Storage & Audio Pipeline

- [ ] **Storage Backend Configuration**
  - For production multi-instance deployments, migrate `STORAGE_BACKEND` from `local` to cloud object storage (`s3` or `gcs`).
  - Configure private buckets with restricted IAM permissions and pre-signed URL access.

- [ ] **System Dependencies**
  - Ensure `ffmpeg` and `ffprobe` binaries are installed in the container image and available on `PATH`.

---

## 5. Pre-Flight Verification & Health Check

- [ ] **Run Full Test Suite Prior to Image Build**
  ```bash
  PYTHONPATH=. pytest backend/tests -m "not real_api"
  ```
  - Ensure 100% pass rate.

- [ ] **Verify Production Health Endpoint**
  ```bash
  curl -fsS https://<YOUR_PRODUCTION_DOMAIN>/api/v1/health
  ```
  - Expected response: `{"status": "healthy", "environment": "production", "version": "0.1.0"}`

- [ ] **Verify IDOR and Export Endpoints**
  - Confirm cross-user lecture, transcript, material, and export requests return `404 Not Found`.
  - Test `GET /api/v1/lectures/{id}/export?format=md` with owner token.

