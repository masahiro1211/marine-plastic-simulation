"""Security-related runtime settings and request checks."""

from __future__ import annotations

import fnmatch
import os
import re

DEFAULT_ALLOWED_ORIGINS = (
    "http://localhost:3000",
    "http://127.0.0.1:3000",
)
DEFAULT_ALLOWED_HOSTS = (
    "localhost",
    "127.0.0.1",
    "testserver",
    "*.onrender.com",
)


def _csv_env(name: str, default: tuple[str, ...]) -> list[str]:
    """Read a comma-separated environment variable into a trimmed list."""
    raw = os.getenv(name)
    if raw is None:
        return list(default)
    values = [value.strip() for value in raw.split(",")]
    return [value for value in values if value]


def allowed_origins() -> list[str]:
    """Return exact browser origins allowed to call REST and WebSocket endpoints."""
    return [
        origin
        for origin in _csv_env("ALLOWED_ORIGINS", DEFAULT_ALLOWED_ORIGINS)
        if "*" not in origin
    ]


def allowed_origin_patterns() -> list[str]:
    """Return wildcard browser origin patterns allowed for preview deployments."""
    return [
        origin
        for origin in _csv_env("ALLOWED_ORIGINS", DEFAULT_ALLOWED_ORIGINS)
        if "*" in origin and origin != "*"
    ]


def allowed_origin_regex() -> str | None:
    """Return a CORS regex built from wildcard origin patterns, if configured."""
    patterns = allowed_origin_patterns()
    if not patterns:
        return None
    regexes = [re.escape(pattern).replace(r"\*", ".*") for pattern in patterns]
    return r"^(?:" + "|".join(regexes) + r")$"


def allowed_hosts() -> list[str]:
    """Return Host headers accepted by the ASGI app."""
    return _csv_env("ALLOWED_HOSTS", DEFAULT_ALLOWED_HOSTS)


def is_allowed_origin(origin: str | None) -> bool:
    """Return whether an Origin header is allowed for browser clients."""
    if origin is None:
        return True
    return origin in allowed_origins() or any(
        fnmatch.fnmatchcase(origin, pattern)
        for pattern in allowed_origin_patterns()
    )
