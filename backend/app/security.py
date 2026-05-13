"""Security-related runtime settings and request checks."""

from __future__ import annotations

import os

DEFAULT_ALLOWED_ORIGINS = (
    "http://localhost:3000",
    "http://127.0.0.1:3000",
)
DEFAULT_ALLOWED_HOSTS = (
    "localhost",
    "127.0.0.1",
    "testserver",
)


def _csv_env(name: str, default: tuple[str, ...]) -> list[str]:
    """Read a comma-separated environment variable into a trimmed list."""
    raw = os.getenv(name)
    if raw is None:
        return list(default)
    values = [value.strip() for value in raw.split(",")]
    return [value for value in values if value]


def allowed_origins() -> list[str]:
    """Return browser origins allowed to call REST and WebSocket endpoints."""
    return _csv_env("ALLOWED_ORIGINS", DEFAULT_ALLOWED_ORIGINS)


def allowed_hosts() -> list[str]:
    """Return Host headers accepted by the ASGI app."""
    return _csv_env("ALLOWED_HOSTS", DEFAULT_ALLOWED_HOSTS)


def is_allowed_origin(origin: str | None) -> bool:
    """Return whether an Origin header is allowed for browser clients."""
    if origin is None:
        return True
    return origin in allowed_origins()
