from pydantic import BaseModel


class Position(BaseModel):
    x: float
    y: float


class AgentState(BaseModel):
    id: int
    agent_type: str  # "fish", "predator", "plastic"
    x: float
    y: float
    angle: float
    energy: float
    alive: bool


class SimulationConfig(BaseModel):
    width: float = 800
    height: float = 600
    num_fish: int = 50
    num_predators: int = 5
    num_plastics: int = 30
    fish_speed: float = 2.0
    predator_speed: float = 1.5
    plastic_drift_speed: float = 0.3
    tick_interval_ms: int = 50


class SimulationSnapshot(BaseModel):
    tick: int
    agents: list[AgentState]
    stats: dict
