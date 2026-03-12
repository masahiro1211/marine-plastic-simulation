"""統計情報の履歴を提供するAPIルーター。"""

from fastapi import APIRouter

from app.dependencies import get_engine

router = APIRouter(prefix="/api/stats", tags=["stats"])


@router.get("/history")
def history():
    """統計情報の履歴を取得する。

    Returns:
        ティックごとの統計エントリ辞書のリスト。
    """
    engine = get_engine()
    return engine.get_stats_history()
