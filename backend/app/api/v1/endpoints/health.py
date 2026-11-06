from typing import Any
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text
from backend.app.core.config import settings
from backend.app.db.session import get_db

router = APIRouter()


@router.get("/health", summary="Health Check")
def health_check(db: Session = Depends(get_db)) -> dict[str, Any]:
    # Check database connectivity
    db_status = "connected"
    try:
        db.execute(text("SELECT 1"))
    except Exception as e:
        db_status = f"disconnected: {str(e)}"

    return {
        "status": "ok",
        "project": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "environment": settings.ENVIRONMENT,
        "auth_mode": settings.AUTH_MODE,
        "database": db_status,
    }

