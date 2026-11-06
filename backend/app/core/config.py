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

    # CORS
    CORS_ORIGINS: list[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000"
    ]


settings = Settings()

