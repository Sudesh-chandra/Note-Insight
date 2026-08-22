"""Shared rate limiter — per-user rate limiting using authenticated user ID."""

from slowapi import Limiter
from slowapi.util import get_remote_address
from starlette.requests import Request


def _get_user_key(request: Request) -> str:
    """Rate limit key function: uses authenticated user ID if available, falls back to IP."""
    # If the route has authenticated the user, use their UID
    user_id = getattr(request.state, "user_id", None)
    if user_id:
        return f"user:{user_id}"
    # Fallback to IP for unauthenticated requests
    return f"ip:{get_remote_address(request)}"


limiter = Limiter(key_func=_get_user_key)
