"""統計情報の履歴を提供するAPIルーター。"""

from fastapi import APIRouter, Query

from app.dependencies import get_engine

router = APIRouter(prefix="/api/stats", tags=["stats"])


@router.get("/history")
def history(session: str | None = Query(default=None)):
    """Return recorded simulation history.

    Returns:
        list[dict]: Per-tick history entries.
    """
    engine = get_engine(session)
    return engine.get_stats_history()
