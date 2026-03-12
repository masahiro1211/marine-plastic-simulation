from fastapi import APIRouter

from app.dependencies import get_engine

router = APIRouter(prefix="/api/simulation", tags=["simulation"])


@router.post("/start")
def start():
    engine = get_engine()
    engine.running = True
    return {"status": "ok", "running": True}


@router.post("/stop")
def stop():
    engine = get_engine()
    engine.running = False
    return {"status": "ok", "running": False}


@router.post("/reset")
def reset():
    engine = get_engine()
    engine.reset()
    return {"status": "ok", "tick": 0}


@router.get("/snapshot")
def snapshot():
    engine = get_engine()
    return engine.get_snapshot()
