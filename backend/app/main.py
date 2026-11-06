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


@asynccontextmanager
async def lifespan(app: FastAPI):
    if settings.ENVIRONMENT == "production" and settings.AUTH_MODE == "dev":
        raise RuntimeError("Refusing to start: AUTH_MODE=dev is not allowed when ENVIRONMENT=production")
    logger.info(f"Starting {settings.PROJECT_NAME} v{settings.VERSION} [{settings.ENVIRONMENT}]")

    # Resume or fail jobs stuck in non-terminal states on startup
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



app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    docs_url=f"{settings.API_V1_STR}/docs",
    redoc_url=f"{settings.API_V1_STR}/redoc",
    lifespan=lifespan,
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
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

# Include v1 Router
app.include_router(api_router, prefix=settings.API_V1_STR)



