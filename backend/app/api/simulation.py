"""シミュレーションの開始・停止・リセット・スナップショット取得を行うAPIルーター。"""

from fastapi import APIRouter, Query

from app.dependencies import get_engine

router = APIRouter(prefix="/api/simulation", tags=["simulation"])


@router.post("/start")
def start(session: str | None = Query(default=None)):
    """Start the simulation runtime.

    Returns:
        dict: Status payload containing running state and phase.
    """
    engine = get_engine(session)
    engine.start()
    return {"status": "ok", "running": engine.running, "phase": engine.phase}


@router.post("/stop")
def stop(session: str | None = Query(default=None)):
    """Stop the simulation runtime.

    Returns:
        dict: Status payload containing running state and phase.
    """
    engine = get_engine(session)
    engine.stop()
    return {"status": "ok", "running": engine.running, "phase": engine.phase}


@router.post("/reset")
def reset(session: str | None = Query(default=None)):
    """Reset the simulation runtime to its initial state.

    Returns:
        dict: Status payload containing the reset tick and phase.
    """
    engine = get_engine(session)
    engine.reset()
    return {"status": "ok", "tick": 0, "phase": engine.phase}


@router.get("/snapshot")
def snapshot(session: str | None = Query(default=None)):
    """Return the current serialized simulation snapshot.

    Returns:
        dict: Snapshot payload with agents, stats, score, and events.
    """
    engine = get_engine(session)
    return engine.get_snapshot()
