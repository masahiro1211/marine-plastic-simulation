"""シミュレーション設定の取得・更新を行うAPIルーター。"""

from fastapi import APIRouter

from app.dependencies import get_engine
from app.models.schemas import SimulationConfig

router = APIRouter(prefix="/api/config", tags=["config"])


@router.get("")
def get_config():
    """Return the current simulation configuration.

    Returns:
        SimulationConfig: Active runtime configuration.
    """
    engine = get_engine()
    return engine.config


@router.put("")
def update_config(config: SimulationConfig):
    """Replace the simulation configuration and reset the runtime.

    Args:
        config: New simulation configuration.

    Returns:
        dict: Status payload containing the updated configuration.
    """
    engine = get_engine()
    engine.reset(config)
    return {"status": "ok", "config": engine.config}
