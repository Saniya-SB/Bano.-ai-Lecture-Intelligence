from typing import Optional
import json
import base64
from fastapi import Depends, Header, status
from sqlalchemy.orm import Session
from sqlalchemy import select

from backend.app.core.config import settings
from backend.app.core.exceptions import AppException
from backend.app.core.logging import logger
from backend.app.db.session import get_db
from backend.app.models.entities import User

# Cached firebase app instance
_firebase_initialized = False


def _get_or_init_firebase():
    global _firebase_initialized
    if not _firebase_initialized:
        import firebase_admin
        from firebase_admin import credentials
        import json

        if firebase_admin._apps:
            _firebase_initialized = True
            return

        if settings.FIREBASE_CREDENTIALS_JSON:
            cred_dict = json.loads(settings.FIREBASE_CREDENTIALS_JSON)
            cred = credentials.Certificate(cred_dict)
            firebase_admin.initialize_app(cred)
            _firebase_initialized = True
        elif settings.FIREBASE_CREDENTIALS_PATH and os.path.exists(settings.FIREBASE_CREDENTIALS_PATH):
            cred = credentials.Certificate(settings.FIREBASE_CREDENTIALS_PATH)
            firebase_admin.initialize_app(cred)
            _firebase_initialized = True
        else:
            raise AppException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                message="Neither FIREBASE_CREDENTIALS_JSON nor valid FIREBASE_CREDENTIALS_PATH is configured",
                code="FIREBASE_CONFIG_ERROR",
            )


def _verify_firebase_token(token: str) -> dict:
    """
    Verifies Firebase ID token with firebase-admin.
    STATUS: Untested until FIREBASE_CREDENTIALS_PATH and real credentials are provided.
    """
    _get_or_init_firebase()
    from firebase_admin import auth

    try:
        decoded_token = auth.verify_id_token(token)
        return decoded_token
    except Exception as e:
        logger.warning(f"Firebase token verification failed: {str(e)}")
        raise AppException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            message="Invalid or expired authentication token",
            code="UNAUTHORIZED",
        )


def _parse_dev_token(token: str) -> dict:
    """
    Accept frontend mock auth in dev mode.
    Handles:
    - empty token / "mock" / "dev" -> fallback to configured DEV_MOCK_USER_*
    - JSON payload (plain or base64) containing user fields (id/uid, email, full_name/name)
    """
    if not token or token in ("mock", "dev", "mock-token", "dev-token"):
        return {
            "id": settings.DEV_MOCK_USER_ID,
            "email": settings.DEV_MOCK_USER_EMAIL,
            "full_name": settings.DEV_MOCK_USER_NAME,
        }

    # Attempt parsing as JSON string directly
    try:
        data = json.loads(token)
        if isinstance(data, dict):
            return {
                "id": str(data.get("id") or data.get("uid") or settings.DEV_MOCK_USER_ID),
                "email": str(data.get("email") or settings.DEV_MOCK_USER_EMAIL),
                "full_name": str(data.get("full_name") or data.get("name") or settings.DEV_MOCK_USER_NAME),
            }
    except Exception:
        pass

    # Attempt parsing as base64-encoded JSON string
    try:
        decoded_bytes = base64.b64decode(token)
        data = json.loads(decoded_bytes.decode("utf-8"))
        if isinstance(data, dict):
            return {
                "id": str(data.get("id") or data.get("uid") or settings.DEV_MOCK_USER_ID),
                "email": str(data.get("email") or settings.DEV_MOCK_USER_EMAIL),
                "full_name": str(data.get("full_name") or data.get("name") or settings.DEV_MOCK_USER_NAME),
            }
    except Exception:
        pass

    # Fallback: Treat token as explicit user_id if alphanumeric/underscore
    return {
        "id": token,
        "email": f"{token}@bano.ai",
        "full_name": settings.DEV_MOCK_USER_NAME,
    }


def get_current_user(
    authorization: Optional[str] = Header(None, alias="Authorization"),
    db: Session = Depends(get_db),
) -> User:
    """
    FastAPI dependency to authenticate requests and get the current user.
    - If AUTH_MODE == 'dev': accepts dev/mock auth token.
    - If AUTH_MODE == 'firebase': verifies ID token with firebase-admin.
    - User row is automatically created in the database on first login.
    - User ID strictly originates from the token, never from request bodies.
    """
    token: Optional[str] = None
    if authorization:
        parts = authorization.split(maxsplit=1)
        if len(parts) == 2 and parts[0].lower() == "bearer":
            token = parts[1].strip()
        elif len(parts) == 1:
            token = parts[0].strip()

    if not token:
        raise AppException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            message="Authorization header with Bearer token is required",
            code="UNAUTHORIZED",
        )

    if settings.AUTH_MODE == "dev":
        if settings.ENVIRONMENT == "production":
            raise AppException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                message="AUTH_MODE=dev is forbidden when ENVIRONMENT=production",
                code="INSECURE_CONFIGURATION",
            )
        user_info = _parse_dev_token(token)
        user_id = user_info["id"]
        email = user_info["email"]
        full_name = user_info["full_name"]
    elif settings.AUTH_MODE == "firebase":
        decoded = _verify_firebase_token(token)
        user_id = decoded.get("uid") or decoded.get("user_id") or decoded.get("sub")
        if not user_id:
            raise AppException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                message="Token payload is missing user ID",
                code="UNAUTHORIZED",
            )
        email = decoded.get("email") or f"{user_id}@bano.ai"
        full_name = decoded.get("name") or decoded.get("email") or "Student"
    else:
        raise AppException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            message=f"Unsupported AUTH_MODE: {settings.AUTH_MODE}",
            code="CONFIG_ERROR",
        )

    # Fetch user or create on first login
    user = db.scalar(select(User).where(User.id == user_id))
    if not user:
        # Check if email is already taken by another user id
        existing_email_user = db.scalar(select(User).where(User.email == email))
        if existing_email_user:
            # Re-associate or make email unique to avoid crashing
            email = f"{user_id}_{email}"

        user = User(
            id=user_id,
            email=email,
            full_name=full_name,
        )
        db.add(user)
        db.commit()
        db.refresh(user)

    return user
