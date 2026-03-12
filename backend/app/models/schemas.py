from __future__ import annotations

from pydantic import BaseModel


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


class AgentState(BaseModel):
    id: int
    agent_type: str
    x: float
    y: float
    angle: float
    energy: float
    alive: bool


class StatsEntry(BaseModel):
    tick: int
    fish: int
    predators: int
    plastics: int
    total: int


class SimulationSnapshot(BaseModel):
    tick: int
    agents: list[AgentState]
    stats: StatsEntry
