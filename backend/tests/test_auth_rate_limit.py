"""Tests for rate limiting configuration and auth module structure."""

import pytest
from unittest.mock import patch, MagicMock, AsyncMock
from starlette.requests import Request


class TestRateLimiterConfig:
    """Verify the rate limiter is correctly configured for per-user limiting."""

    def test_limiter_import(self):
        """The shared limiter should be importable."""
        from app.limiter import limiter
        assert limiter is not None

    def test_user_key_function_with_user(self):
        """When request.state has user_id, key should be 'user:<uid>'."""
        from app.limiter import _get_user_key

        mock_request = MagicMock(spec=Request)
        mock_state = MagicMock()
        mock_state.user_id = "test-uid-123"
        mock_request.state = mock_state

        key = _get_user_key(mock_request)
        assert key == "user:test-uid-123"

    def test_user_key_function_without_user(self):
        """When no user_id in state, key should fall back to IP."""
        from app.limiter import _get_user_key

        mock_request = MagicMock(spec=Request)
        # Simulate no user_id attribute
        del mock_request.state.user_id

        with patch("app.limiter.get_remote_address", return_value="192.168.1.1"):
            key = _get_user_key(mock_request)
            assert key.startswith("ip:")


class TestAuthModuleStructure:
    """Verify the auth module has the correct structure for Firebase token verification."""

    def test_get_current_user_is_async(self):
        """get_current_user must be an async function (FastAPI dependency)."""
        import asyncio
        from app.auth import get_current_user
        assert asyncio.iscoroutinefunction(get_current_user)

    def test_security_is_http_bearer(self):
        """The security scheme must be HTTPBearer."""
        from app.auth import security
        from fastapi.security import HTTPBearer
        assert isinstance(security, HTTPBearer)
