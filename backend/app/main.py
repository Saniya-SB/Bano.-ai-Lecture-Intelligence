import os
from contextlib import asynccontextmanager
import uuid
from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from backend.app.core.config import settings
from backend.app.core.exceptions import (
    AppException,
    app_exception_handler,
    validation_exception_handler,
    generic_exception_handler,
)
from backend.app.api.v1.router import api_router
from backend.app.core.logging import logger
import firebase_admin
from firebase_admin import credentials

# Initialize Firebase Admin SDK using service account credentials from .env or JSON string
firebase_path = os.getenv("FIREBASE_CREDENTIALS_PATH")
firebase_json = os.getenv("FIREBASE_CREDENTIALS_JSON")

if not firebase_admin._apps:
    if firebase_json:
        import json
        cred_dict = json.loads(firebase_json)
        cred = credentials.Certificate(cred_dict)
        firebase_admin.initialize_app(cred)
    elif firebase_path and os.path.exists(firebase_path):
        cred = credentials.Certificate(firebase_path)
        firebase_admin.initialize_app(cred)

# ---------------------------------------------------------------------------
# Application lifespan (startup / shutdown)
# ---------------------------------------------------------------------------
@asynccontextmanager
async def lifespan(app: FastAPI):
    if settings.ENVIRONMENT == "production":
        if settings.AUTH_MODE == "dev":
            raise RuntimeError("Refusing to start: AUTH_MODE=dev is not allowed when ENVIRONMENT=production")
        if settings.LLM_TIER == "free":
            raise RuntimeError("Refusing to start: LLM_TIER=free is not allowed when ENVIRONMENT=production")
    logger.info(f"Starting {settings.PROJECT_NAME} v{settings.VERSION} [{settings.ENVIRONMENT}]")

    # Resume or fail jobs stuck in non‑terminal states on startup
    try:
        from backend.app.db.session import SessionLocal
        from backend.app.services.job_machine import JobStateMachine
        with SessionLocal() as db:
            recovered = JobStateMachine.recover_stuck_jobs(db)
            if recovered > 0:
                logger.info(f"Startup recovery handled {recovered} stuck job(s)")
    except Exception as e:
        logger.warning(f"Error during job recovery on startup: {e}")

    yield
    logger.info(f"Shutting down {settings.PROJECT_NAME}")

# ---------------------------------------------------------------------------
# FastAPI app definition
# ---------------------------------------------------------------------------
app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    docs_url=f"{settings.API_V1_STR}/docs",
    redoc_url=f"{settings.API_V1_STR}/redoc",
    lifespan=lifespan,
)

# Session middleware required for Authlib OAuth flows (stores temporary state in signed cookies)
from starlette.middleware.sessions import SessionMiddleware
app.add_middleware(SessionMiddleware, secret_key=os.getenv("SECRET_KEY", "change-me-secret"))

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Correlation ID middleware
@app.middleware("http")
async def request_id_middleware(request: Request, call_next):
    request_id = request.headers.get("X-Request-ID") or str(uuid.uuid4())
    request.state.request_id = request_id
    response = await call_next(request)
    response.headers["X-Request-ID"] = request_id
    return response

# Exception Handlers
app.add_exception_handler(AppException, app_exception_handler)
app.add_exception_handler(RequestValidationError, validation_exception_handler)
app.add_exception_handler(Exception, generic_exception_handler)

# Include API router
app.include_router(api_router, prefix=settings.API_V1_STR)

# Expose benchmark endpoint at root (optional convenience)
from backend.app.api.v1.endpoints.benchmark import router as benchmark_router
app.include_router(benchmark_router)
