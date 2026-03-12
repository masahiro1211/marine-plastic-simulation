import asyncio

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

from app.models.schemas import SimulationConfig
from app.simulation.engine import SimulationEngine

app = FastAPI(title="Marine Plastic Simulation")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

engine = SimulationEngine()


@app.get("/api/config")
def get_config():
    return engine.config


@app.post("/api/config")
def update_config(config: SimulationConfig):
    engine.reset(config)
    return {"status": "ok", "config": engine.config}


@app.post("/api/reset")
def reset_simulation():
    engine.reset()
    return {"status": "ok"}


@app.get("/api/snapshot")
def get_snapshot():
    return engine.get_snapshot()


@app.websocket("/ws/simulation")
async def simulation_ws(websocket: WebSocket):
    await websocket.accept()
    engine.running = True
    try:
        while engine.running:
            # Check for control messages (non-blocking)
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
