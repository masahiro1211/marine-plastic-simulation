"""シミュレーション設定の取得・更新を行うAPIルーター。"""

from fastapi import APIRouter

from app.dependencies import get_engine
from app.models.schemas import SimulationConfig

router = APIRouter(prefix="/api/config", tags=["config"])


@router.get("")
def get_config():
    """現在のシミュレーション設定を取得する。

    Returns:
        現在のSimulationConfig設定オブジェクト。
    """
    engine = get_engine()
    return engine.config


@router.put("")
def update_config(config: SimulationConfig):
    """シミュレーション設定を更新し、シミュレーションをリセットする。

    Args:
        config: 新しいシミュレーション設定。

    Returns:
        ステータスと更新後の設定を含む辞書。
    """
    engine = get_engine()
    engine.reset(config)
    return {"status": "ok", "config": engine.config}
