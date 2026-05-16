"""WebSocketによるリアルタイムシミュレーション通信を行うルーター。"""

import asyncio
import json
import math
from typing import Any

from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from pydantic import ValidationError

from app.dependencies import get_engine, normalize_session_id
from app.models.schemas import SimulationConfig
from app.security import is_allowed_origin

router = APIRouter(tags=["websocket"])


MAX_CONTROL_MESSAGE_BYTES = 8192
_tick_owners: dict[str, object] = {}
_connection_counts: dict[str, int] = {}


def _add_connection(session_id: str) -> None:
    _connection_counts[session_id] = _connection_counts.get(session_id, 0) + 1


def _remove_connection(session_id: str) -> int:
    remaining = max(_connection_counts.get(session_id, 0) - 1, 0)
    if remaining:
        _connection_counts[session_id] = remaining
    else:
        _connection_counts.pop(session_id, None)
    return remaining


def _claim_tick_owner(session_id: str, token: object) -> bool:
    owner = _tick_owners.get(session_id)
    if owner is None:
        _tick_owners[session_id] = token
        return True
    return owner is token


def _release_tick_owner(session_id: str, token: object) -> None:
    if _tick_owners.get(session_id) is token:
        _tick_owners.pop(session_id, None)


def _bounded_float(value: Any, *, default: float, minimum: float, maximum: float) -> float:
    """Coerce client numeric input into a finite bounded float."""
    try:
        number = float(value)
    except (TypeError, ValueError):
        return default
    if not math.isfinite(number):
        return default
    return min(max(number, minimum), maximum)


async def _handle_control_message(
    websocket: WebSocket,
    engine: Any,
    data: str,
) -> bool:
    """Apply one client control message.

    Returns:
        True when the websocket was closed and the stream should stop.
    """
    if len(data.encode("utf-8")) > MAX_CONTROL_MESSAGE_BYTES:
        await websocket.close(code=1009)
        return True
    message = json.loads(data)
    if not isinstance(message, dict):
        return False
    action = message.get("action")
    if action == "stop":
        engine.stop()
    elif action == "reset":
        config_data = message.get("config")
        if config_data:
            engine.reset(SimulationConfig(**config_data))
        else:
            engine.reset()
        engine.start()
    elif action == "update_config":
        config_data = message.get("config", {})
        engine.reset(SimulationConfig(**config_data))
    elif action == "start":
        engine.start()
    elif action == "manual_move":
        dx = _bounded_float(message.get("dx"), default=0.0, minimum=-1.0, maximum=1.0)
        dy = _bounded_float(message.get("dy"), default=0.0, minimum=-1.0, maximum=1.0)
        for agent in engine.collectors:
            if getattr(agent, "is_manual", False):
                agent.manual_vx = dx
                agent.manual_vy = dy
    return False


@router.websocket("/ws/simulation")
async def simulation_ws(websocket: WebSocket):
    """Stream live simulation snapshots over a WebSocket connection.

    The endpoint accepts control actions such as ``start``, ``stop``,
    ``reset``, and ``update_config`` while continuously sending snapshots.

    Args:
        websocket: Active client connection.
    """
    if not is_allowed_origin(websocket.headers.get("origin")):
        await websocket.close(code=1008)
        return

    session_id = normalize_session_id(websocket.query_params.get("session"))
    engine = get_engine(session_id)
    connection_token = object()
    await websocket.accept()
    _add_connection(session_id)
    loop = asyncio.get_running_loop()
    receive_task = asyncio.create_task(websocket.receive_text())
    next_tick_at = loop.time()
    disconnected = False
    try:
        while True:
            timeout = max(0.0, next_tick_at - loop.time())
            done, _ = await asyncio.wait(
                {receive_task},
                timeout=timeout,
                return_when=asyncio.FIRST_COMPLETED,
            )

            if receive_task in done:
                try:
                    data = receive_task.result()
                    should_stop = await _handle_control_message(websocket, engine, data)
                    if should_stop:
                        return
                except (json.JSONDecodeError, TypeError, ValidationError):
                    pass
                receive_task = asyncio.create_task(websocket.receive_text())

            now = loop.time()
            if now < next_tick_at:
                continue

            should_tick = _claim_tick_owner(session_id, connection_token)
            if should_tick and engine.running:
                engine.step()
            await websocket.send_json(engine.get_snapshot())
            if engine.phase == "completed" and not engine.running:
                break

            interval_seconds = max(engine.config.tick_interval_ms / 1000, 0.001)
            next_tick_at = now + interval_seconds
    except WebSocketDisconnect:
        disconnected = True
    finally:
        _release_tick_owner(session_id, connection_token)
        remaining_connections = _remove_connection(session_id)
        if disconnected and remaining_connections == 0:
            engine.stop()
        if not receive_task.done():
            receive_task.cancel()
