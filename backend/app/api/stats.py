from fastapi import APIRouter

from app.dependencies import get_engine

router = APIRouter(prefix="/api/stats", tags=["stats"])


@router.get("/history")
def history():
    engine = get_engine()
    return engine.get_stats_history()
