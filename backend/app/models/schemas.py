from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, Field


class SimulationConfig(BaseModel):
    """Runtime config for the cleanup simulation."""

    width: float = 960
    height: float = 640
    steps: int = 600
    tick_interval_ms: int = 50

    scout_count: int = 2
    collector_count: int = 3
    marine_life_count: int = 10
    initial_trash_count: int = 18

    scout_speed: float = 2.2
    collector_speed: float = 1.8
    marine_life_speed: float = 1.6
    trash_drift_speed: float = 0.35

    trash_weight: float = 1.0
    avoid_marine_life_weight: float = 1.15
    avoid_robot_weight: float = 0.85
    random_weight: float = 0.3

    scout_sensor_radius: float = 110
    collector_sensor_radius: float = 42
    collector_pickup_radius: float = 16
    marine_life_avoid_radius: float = 90
    collision_radius: float = 18
    base_radius: float = 48

    max_energy: float = 100
    energy_drain_per_tick: float = 0.55
    energy_charge_per_tick: float = 3.0
    return_speed_factor: float = 0.45
    low_energy_threshold: float = 18

    trash_spawn_interval: int = 24
    max_trash: int = 30

    stress_gain_per_robot: float = 0.85
    stress_decay_per_tick: float = 0.18
    stress_threshold: float = 10.0
    marine_life_respawn_delay: int = 90

    sharing_mode: Literal["global", "local"] = "global"


class BaseState(BaseModel):
    x: float
    y: float
    radius: float


class AgentState(BaseModel):
    id: str
    agent_type: str
    role: str
    x: float
    y: float
    vx: float
    vy: float
    alive: bool
    status: str
    energy: float
    target_id: str | None = None
    metadata: dict[str, Any] = Field(default_factory=dict)


class SimulationStats(BaseModel):
    scouts: int
    collectors: int
    marine_life: int
    trash_remaining: int
    active_robots: int
    delivered_trash: int


class ScoreState(BaseModel):
    total: float
    trash_delivered: int
    collisions: int
    marine_life_stress: float
    energy_remaining: float


class SimulationEvent(BaseModel):
    event_type: str
    actor_id: str | None = None
    target_id: str | None = None
    tick: int
    payload: dict[str, Any] = Field(default_factory=dict)


class HistoryEntry(BaseModel):
    tick: int
    delivered_trash: int
    collisions: int
    marine_life_stress: float
    energy_remaining: float
    total_score: float
    trash_remaining: int


class SimulationSnapshot(BaseModel):
    tick: int
    phase: str
    config: SimulationConfig
    base: BaseState
    agents: list[AgentState]
    stats: SimulationStats
    score: ScoreState
    events: list[SimulationEvent]
