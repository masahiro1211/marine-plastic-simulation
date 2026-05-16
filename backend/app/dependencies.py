"""Simulation engine dependency helpers."""

from __future__ import annotations

import os
import re

from app.simulation.engine import SimulationEngine

DEFAULT_SESSION_ID = "default"
MAX_SESSION_ENGINES = int(os.getenv("MAX_SESSION_ENGINES", "32"))
SESSION_ID_PATTERN = re.compile(r"[^a-zA-Z0-9_-]+")

_engines: dict[str, SimulationEngine] = {DEFAULT_SESSION_ID: SimulationEngine()}


def normalize_session_id(session: str | None) -> str:
    """Return a bounded, URL-safe session id for engine lookup."""
    if not session:
        return DEFAULT_SESSION_ID
    normalized = SESSION_ID_PATTERN.sub("-", session.strip())[:64].strip("-_")
    return normalized or DEFAULT_SESSION_ID


def get_engine(session: str | None = None) -> SimulationEngine:
    """Return the simulation engine for a browser/session."""
    session_id = normalize_session_id(session)
    engine = _engines.get(session_id)
    if engine is not None:
        return engine

    if len(_engines) >= MAX_SESSION_ENGINES:
        # Keep memory bounded on public deployments.
        return _engines[DEFAULT_SESSION_ID]

    engine = SimulationEngine()
    _engines[session_id] = engine
    return engine
