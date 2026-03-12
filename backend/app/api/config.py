from fastapi import APIRouter

from app.dependencies import get_engine
from app.models.schemas import SimulationConfig

router = APIRouter(prefix="/api/config", tags=["config"])


@router.get("")
def get_config():
    engine = get_engine()
    return engine.config


@router.put("")
def update_config(config: SimulationConfig):
    engine = get_engine()
    engine.reset(config)
    return {"status": "ok", "config": engine.config}
