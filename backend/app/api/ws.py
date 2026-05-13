"""WebSocketによるリアルタイムシミュレーション通信を行うルーター。"""

import asyncio
import json
import math
from typing import Any

from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from pydantic import ValidationError

from app.dependencies import get_engine
from app.models.schemas import SimulationConfig
from app.security import is_allowed_origin

router = APIRouter(tags=["websocket"])


MAX_CONTROL_MESSAGE_BYTES = 8192


def _bounded_float(value: Any, *, default: float, minimum: float, maximum: float) -> float:
    """Coerce client numeric input into a finite bounded float."""
    try:
        number = float(value)
    except (TypeError, ValueError):
        return default
    if not math.isfinite(number):
        return default
    return min(max(number, minimum), maximum)


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

    engine = get_engine()
    await websocket.accept()
    try:
        while True:
            try:
                data = await asyncio.wait_for(
                    websocket.receive_text(), timeout=0.01
                )
                if len(data.encode("utf-8")) > MAX_CONTROL_MESSAGE_BYTES:
                    await websocket.close(code=1009)
                    return
                message = json.loads(data)
                if not isinstance(message, dict):
                    continue
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
            except asyncio.TimeoutError:
                pass
            except (json.JSONDecodeError, TypeError, ValidationError):
                continue

            snapshot = engine.get_snapshot()
            if engine.running:
                engine.step()
                snapshot = engine.get_snapshot()
            await websocket.send_json(snapshot)
            if engine.phase == "completed" and not engine.running:
                break
            await asyncio.sleep(engine.config.tick_interval_ms / 1000)
    except WebSocketDisconnect:
        engine.stop()
