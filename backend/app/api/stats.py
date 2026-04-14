"""統計情報の履歴を提供するAPIルーター。"""

from fastapi import APIRouter

from app.dependencies import get_engine

router = APIRouter(prefix="/api/stats", tags=["stats"])


@router.get("/history")
def history():
    """Return recorded simulation history.

    Returns:
        list[dict]: Per-tick history entries.
    """
    engine = get_engine()
    return engine.get_stats_history()
