from fastapi import APIRouter, Depends
from backend.app.api.deps import get_current_user
from backend.app.models.entities import User
from backend.app.schemas.lecture import UserResponse

router = APIRouter(prefix="/users", tags=["Users"])


@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    """
    Get the currently authenticated user's profile.
    """
    return {
        "id": current_user.id,
        "email": current_user.email,
        "full_name": current_user.full_name,
        "created_at": current_user.created_at.isoformat() if current_user.created_at else "",
        "updated_at": current_user.updated_at.isoformat() if current_user.updated_at else None,
    }

