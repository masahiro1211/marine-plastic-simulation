import asyncio

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from app.dependencies import get_engine
from app.models.schemas import SimulationConfig

router = APIRouter(tags=["websocket"])


@router.websocket("/ws/simulation")
async def simulation_ws(websocket: WebSocket):
    engine = get_engine()
    await websocket.accept()
    engine.running = True
    try:
        while engine.running:
            try:
                data = await asyncio.wait_for(
                    websocket.receive_json(), timeout=0.01
                )
                action = data.get("action")
                if action == "stop":
                    engine.running = False
                    break
                elif action == "reset":
                    config_data = data.get("config")
                    if config_data:
                        engine.reset(SimulationConfig(**config_data))
                    else:
                        engine.reset()
                elif action == "update_config":
                    config_data = data.get("config", {})
                    engine.reset(SimulationConfig(**config_data))
            except asyncio.TimeoutError:
                pass

            engine.step()
            snapshot = engine.get_snapshot()
            await websocket.send_json(snapshot)
            await asyncio.sleep(engine.config.tick_interval_ms / 1000)
    except WebSocketDisconnect:
        engine.running = False
