from typing import Literal, Optional
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
    DEV_MARK_UPLOADS_AS_TEST: bool = False
    FIREBASE_CREDENTIALS_PATH: str = ""
    FIREBASE_CREDENTIALS_JSON: str = ""
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

    # Ask this Lecture Configuration
    ASK_LECTURE_MAX_SEGMENTS: int = 5
    ASK_LECTURE_RATE_LIMIT_PER_MINUTE: int = 10
    ASK_LECTURE_PROMPT_VERSION: str = "v1.0"

    # LLM Settings & Pricing Configuration
    LLM_PROVIDER: Literal["gemini", "openai", "groq"] = "gemini"
    LLM_FALLBACK_PROVIDER: Optional[Literal["gemini", "openai", "groq"]] = "groq"
    LLM_TIER: Literal["free", "paid"] = "free"
    
    # Model IDs
    GEMINI_DEFAULT_MODEL: str = "gemini-flash-lite-latest"
    GEMINI_FALLBACK_MODEL: str = "gemini-flash-latest"
    OPENAI_DEFAULT_MODEL: str = "gpt-4o-mini"
    GROQ_DEFAULT_MODEL: str = "qwen/qwen3.8-27b"
    GROQ_FALLBACK_MODEL: str = "openai/gpt-oss-20b"
    
    # API Keys
    GEMINI_API_KEY: str = ""
    OPENAI_API_KEY: str = ""
    GROQ_API_KEY: str = ""
    
    # Pricing configuration per 1M tokens (USD)
    LLM_PRICING_PER_1M: dict[str, dict[str, float]] = {
        "gemini-flash-lite-latest": {"input": 0.075, "output": 0.30},
        "gemini-flash-latest": {"input": 0.15, "output": 0.60},
        "gemini-3.1-flash-lite": {"input": 0.25, "output": 1.50},
        "gemini-3.8-flash": {"input": 0.75, "output": 3.75},
        "gpt-4o-mini": {"input": 0.15, "output": 0.60},
        "llama-3.3-70b-versatile": {"input": 0.59, "output": 0.79},
        "llama-3.1-8b-instant": {"input": 0.05, "output": 0.08},
        "qwen/qwen3.8-27b": {"input": 0.20, "output": 0.60},
        "openai/gpt-oss-20b": {"input": 0.10, "output": 0.30},
    }
    
    # STT Pricing configuration per minute (USD)
    # Set to None/omitted when pricing is not verified or unconfigured.
    STT_PRICING_PER_MINUTE: dict[str, Optional[float]] = {
        "gnani": None,  # Not officially published; user will configure real price
        "whisper": 0.0060,  # OpenAI Whisper API ($0.006/min official)
        "google_speech": 0.0160,  # Google Cloud Speech-to-Text standard ($0.016/min official)
        "azure_speech": 0.0167,  # Azure AI Speech standard ($1.00/hr official)
        "aws_transcribe": 0.0240,  # AWS Transcribe standard ($0.024/min official)
    }

    # Prompt Versioning & Chunking
    LLM_PROMPT_VERSION: str = "v1.0"
    LLM_CHUNK_MAX_TOKENS: int = 12000  # Conservative segment chunk limit
    LLM_CHUNK_OVERLAP_TOKENS: int = 500

    # Faster Whisper settings
    FASTER_WHISPER_MODEL: str = "small"

    # Job Execution & Resumption
    MAX_JOB_RETRIES: int = 3

    # CORS
    CORS_ORIGINS: list[str] = [
        "http://localhost:3000",
        "https://*.vercel.app",
    ]


settings = Settings()

