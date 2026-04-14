"""シミュレーションの開始・停止・リセット・スナップショット取得を行うAPIルーター。"""

from fastapi import APIRouter

from app.dependencies import get_engine

router = APIRouter(prefix="/api/simulation", tags=["simulation"])


@router.post("/start")
def start():
    """Start the simulation runtime.

    Returns:
        dict: Status payload containing running state and phase.
    """
    engine = get_engine()
    engine.start()
    return {"status": "ok", "running": engine.running, "phase": engine.phase}


@router.post("/stop")
def stop():
    """Stop the simulation runtime.

    Returns:
        dict: Status payload containing running state and phase.
    """
    engine = get_engine()
    engine.stop()
    return {"status": "ok", "running": engine.running, "phase": engine.phase}


@router.post("/reset")
def reset():
    """Reset the simulation runtime to its initial state.

    Returns:
        dict: Status payload containing the reset tick and phase.
    """
    engine = get_engine()
    engine.reset()
    return {"status": "ok", "tick": 0, "phase": engine.phase}


@router.get("/snapshot")
def snapshot():
    """Return the current serialized simulation snapshot.

    Returns:
        dict: Snapshot payload with agents, stats, score, and events.
    """
    engine = get_engine()
    return engine.get_snapshot()
