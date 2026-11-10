from fastapi import APIRouter, Request, HTTPException, status
from fastapi.responses import RedirectResponse
from starlette.middleware.sessions import SessionMiddleware
from authlib.integrations.starlette_client import OAuth
import os

router = APIRouter(prefix="/auth", tags=["Auth"])

# The SessionMiddleware must be added to the FastAPI app (once). If not already present, it will be added in main.py.

# Configure OAuth client using env vars (set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in .env)

oauth = OAuth()
oauth.register(
    name="google",
    client_id=os.getenv("GOOGLE_CLIENT_ID"),
    client_secret=os.getenv("GOOGLE_CLIENT_SECRET"),
    server_metadata_url="https://accounts.google.com/.well-known/openid-configuration",
    client_kwargs={"scope": "openid email profile"},
)

@router.get("/login")
async def login(request: Request):
    """Redirect the user to Google consent screen."""
    if not os.getenv("GOOGLE_CLIENT_ID") or not os.getenv("GOOGLE_CLIENT_SECRET"):
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Google OAuth client ID/secret not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in .env.",
        )
    redirect_uri = request.url_for("callback")
    return await oauth.google.authorize_redirect(request, redirect_uri)

@router.get("/callback")
async def callback(request: Request):
    """Handle Google OAuth callback, store user info in session.

    In a production setup you would create / fetch a user record and issue your own JWT.
    For now we simply store the user data in the session for quick testing.
    """
    try:
        token = await oauth.google.authorize_access_token(request)
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))

    user_info = token.get("userinfo")
    if not user_info:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to retrieve user info from Google",
        )

    # Store minimal user info in session
    request.session["user"] = {
        "id": user_info.get("sub"),
        "email": user_info.get("email"),
        "name": user_info.get("name"),
        "picture": user_info.get("picture"),
    }
    # You could also create a Firebase custom token here if you want to integrate with existing auth flow.
    # Create a Firebase custom token so the frontend can sign in with Firebase
    from firebase_admin import auth as firebase_auth
    try:
        firebase_custom_token = firebase_auth.create_custom_token(user_info.get("sub"))
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create Firebase custom token: {str(e)}",
        )
    # Return the custom token in JSON (frontend can exchange it for a Firebase ID token)
    return {"firebase_custom_token": firebase_custom_token.decode() if isinstance(firebase_custom_token, bytes) else firebase_custom_token}


@router.get("/logout")
async def logout(request: Request):
    request.session.clear()
    return {"message": "Logged out"}

