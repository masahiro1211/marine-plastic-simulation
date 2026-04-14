"""シミュレーションの開始・停止・リセット・スナップショット取得を行うAPIルーター。"""

from fastapi import APIRouter

from app.dependencies import get_engine

router = APIRouter(prefix="/api/simulation", tags=["simulation"])


@router.post("/start")
def start():
    """シミュレーションを開始する。

    Returns:
        ステータスと実行状態を含む辞書。
    """
    engine = get_engine()
    engine.start()
    return {"status": "ok", "running": engine.running, "phase": engine.phase}


@router.post("/stop")
def stop():
    """シミュレーションを停止する。

    Returns:
        ステータスと実行状態を含む辞書。
    """
    engine = get_engine()
    engine.stop()
    return {"status": "ok", "running": engine.running, "phase": engine.phase}


@router.post("/reset")
def reset():
    """シミュレーションをリセットする。

    Returns:
        ステータスとティック数を含む辞書。
    """
    engine = get_engine()
    engine.reset()
    return {"status": "ok", "tick": 0, "phase": engine.phase}


@router.get("/snapshot")
def snapshot():
    """シミュレーションの現在のスナップショットを取得する。

    Returns:
        ティック数、エージェント一覧、統計情報を含む辞書。
    """
    engine = get_engine()
    return engine.get_snapshot()
