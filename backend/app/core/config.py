from typing import Literal
from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=("backend/.env", ".env"),
        env_file_encoding="utf-8",
        extra="ignore"
    )

    PROJECT_NAME: str = "Bano.ai Lecture Intelligence API"
    VERSION: str = "0.1.0"
    API_V1_STR: str = "/api/v1"
    
    # Environment & Auth mode
    ENVIRONMENT: Literal["development", "test", "production"] = "development"
    AUTH_MODE: Literal["dev", "firebase"] = "dev"
    FIREBASE_CREDENTIALS_PATH: str = ""
    DEV_MOCK_USER_ID: str = "usr_mock_1"
    DEV_MOCK_USER_EMAIL: str = "student@bano.ai"
    DEV_MOCK_USER_NAME: str = "Aman Sharma"

    # Database
    DATABASE_URL: str = Field(
        default="postgresql+psycopg2://bano_user:bano_password@localhost:5432/bano_db",
        description="SQLAlchemy database connection string"
    )
    # Test Database URL (SQLite in-memory for lightning fast local unit/smoke tests)
    TEST_DATABASE_URL: str = "sqlite:///:memory:"

    # Gnani STT
    GNANI_API_KEY: str = ""
    GNANI_BASE_URL: str = "https://api.vachana.ai"
    GNANI_REST_MAX_DURATION_SECONDS: int = 30
    GNANI_BATCH_POLL_INTERVAL_SECONDS: float = 2.0
    GNANI_BATCH_TIMEOUT_SECONDS: int = 300

    # Storage & Upload Limits
    STORAGE_BACKEND: Literal["local", "gcs", "s3"] = "local"
    LOCAL_STORAGE_DIR: str = "/tmp/bano_storage"
    MAX_UPLOAD_FILE_SIZE_BYTES: int = 500 * 1024 * 1024  # 500 MB
    MIN_UPLOAD_DURATION_SECONDS: float = 3.0
    MAX_UPLOAD_DURATION_SECONDS: float = 7200.0  # 2 hours
    FFMPEG_PATH: str = "ffmpeg"
    FFPROBE_PATH: str = "ffprobe"

    # Transliteration
    TRANSLITERATION_LLM_FALLBACK: bool = False  # Reserved for future LLM-based fallback; not wired in

    # Job Execution & Resumption
    MAX_JOB_RETRIES: int = 3

    # CORS
    CORS_ORIGINS: list[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000"
    ]


settings = Settings()

