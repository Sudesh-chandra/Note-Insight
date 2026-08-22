import firebase_admin
from firebase_admin import auth, credentials
from fastapi import HTTPException, Depends, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.config import settings

# Initialize Firebase Admin SDK (only once)
if not firebase_admin._apps:
    cred = credentials.Certificate({
        "type": "service_account",
        "project_id": settings.firebase_project_id,
        "private_key_id": settings.firebase_private_key_id,
        "private_key": settings.firebase_private_key.replace("\\n", "\n"),
        "client_email": settings.firebase_client_email,
        "client_id": settings.firebase_client_id,
        "auth_uri": settings.firebase_auth_uri,
        "token_uri": settings.firebase_token_uri,
        "auth_provider_x509_cert_url": settings.firebase_cert_url,
    })
    firebase_admin.initialize_app(cred)

security = HTTPBearer()


async def get_current_user(
    request: Request,
    credentials_token: HTTPAuthorizationCredentials = Depends(security),
) -> str:
    """Verify Firebase ID token and return the user's UID.

    This is the core security gate — every protected endpoint depends on it.
    We NEVER trust a user ID sent from the client.
    Also stores user_id in request.state for the per-user rate limiter.
    """
    try:
        decoded = auth.verify_id_token(credentials_token.credentials)
        uid = decoded["uid"]
        # Store in request.state so the rate limiter can key by user
        request.state.user_id = uid
        return uid
    except auth.ExpiredIdTokenError:
        raise HTTPException(status_code=401, detail="Session expired. Please log in again.")
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid authentication token.")
