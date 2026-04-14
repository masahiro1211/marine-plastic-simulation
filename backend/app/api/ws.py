"""WebSocketによるリアルタイムシミュレーション通信を行うルーター。"""

import asyncio

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from app.dependencies import get_engine
from app.models.schemas import SimulationConfig

router = APIRouter(tags=["websocket"])


@router.websocket("/ws/simulation")
async def simulation_ws(websocket: WebSocket):
    """Stream live simulation snapshots over a WebSocket connection.

    The endpoint accepts control actions such as ``start``, ``stop``,
    ``reset``, and ``update_config`` while continuously sending snapshots.

    Args:
        websocket: Active client connection.
    """
    engine = get_engine()
    await websocket.accept()
    engine.start()
    try:
        while True:
            try:
                data = await asyncio.wait_for(
                    websocket.receive_json(), timeout=0.01
                )
                action = data.get("action")
                if action == "stop":
                    engine.stop()
                elif action == "reset":
                    config_data = data.get("config")
                    if config_data:
                        engine.reset(SimulationConfig(**config_data))
                    else:
                        engine.reset()
                    engine.start()
                elif action == "update_config":
                    config_data = data.get("config", {})
                    engine.reset(SimulationConfig(**config_data))
                elif action == "start":
                    engine.start()
            except asyncio.TimeoutError:
                pass

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
