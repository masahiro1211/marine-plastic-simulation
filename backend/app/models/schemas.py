from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, Field


class SimulationConfig(BaseModel):
    """Configuration values for one simulation run.

    Attributes:
        width: Width of the simulation world in pixels.
        height: Height of the simulation world in pixels.
        steps: Maximum number of ticks before auto-completion.
        tick_interval_ms: Delay between ticks for streaming clients.
        scout_count: Number of scout robots to spawn.
        collector_count: Number of collector robots to spawn.
        marine_life_count: Number of marine life agents to spawn.
        initial_trash_count: Initial number of trash agents.
        scout_speed: Movement speed for scout robots.
        collector_speed: Movement speed for collector robots.
        marine_life_speed: Movement speed for marine life agents.
        trash_drift_speed: Drift speed for trash agents.
        trash_weight: Weight for trash-oriented behaviors.
        avoid_marine_life_weight: Avoidance weight around marine life.
        avoid_robot_weight: Avoidance weight around other robots.
        random_weight: Random motion contribution for wandering.
        scout_sensor_radius: Detection radius for scouts.
        collector_sensor_radius: Detection radius for collectors.
        collector_pickup_radius: Pickup distance for collectors.
        marine_life_avoid_radius: Range where marine life flees robots.
        collision_radius: Distance threshold counted as a collision.
        base_radius: Radius of the base interaction zone.
        max_energy: Maximum robot energy.
        energy_drain_per_tick: Energy consumption per tick while active.
        energy_charge_per_tick: Energy restored per tick at base.
        return_speed_factor: Speed multiplier when returning on low energy.
        low_energy_threshold: Threshold that triggers base return.
        trash_spawn_interval: Tick interval for spawning new trash.
        max_trash: Maximum trash agents allowed at once.
        stress_gain_per_robot: Stress added per nearby robot.
        stress_decay_per_tick: Stress decay when marine life is calm.
        stress_threshold: Stress level at which marine life is lost.
        marine_life_respawn_delay: Delay before lost marine life respawns.
        sharing_mode: Strategy for scout-to-collector target sharing.
    """

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
    """Serializable state for the base area.

    Attributes:
        x: Horizontal position.
        y: Vertical position.
        radius: Interaction radius.
    """

    x: float
    y: float
    radius: float


class AgentState(BaseModel):
    """Serializable state for one simulation actor.

    Attributes:
        id: Unique agent identifier.
        agent_type: Technical type used by the renderer.
        role: Logical role used by the simulation.
        x: Horizontal position.
        y: Vertical position.
        vx: Horizontal velocity.
        vy: Vertical velocity.
        alive: Whether the agent is active.
        status: Current behavior status label.
        energy: Current energy value.
        target_id: Identifier of the current target, if any.
        metadata: Agent-specific auxiliary fields.
    """

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
    """Aggregated counts for the current tick.

    Attributes:
        scouts: Number of active scouts.
        collectors: Number of active collectors.
        marine_life: Number of active marine life agents.
        trash_remaining: Number of active trash agents.
        active_robots: Number of robots with remaining energy.
        delivered_trash: Total trash delivered so far.
    """

    scouts: int
    collectors: int
    marine_life: int
    trash_remaining: int
    active_robots: int
    delivered_trash: int


class ScoreState(BaseModel):
    """Score breakdown for the current tick.

    Attributes:
        total: Total computed score.
        trash_delivered: Delivered trash contribution.
        collisions: Collision penalty contribution.
        marine_life_stress: Marine-life stress penalty contribution.
        energy_remaining: Remaining energy bonus contribution.
    """

    total: float
    trash_delivered: int
    collisions: int
    marine_life_stress: float
    energy_remaining: float


class SimulationEvent(BaseModel):
    """Domain event emitted during a tick.

    Attributes:
        event_type: Event kind identifier.
        actor_id: Primary actor for the event, if any.
        target_id: Secondary target for the event, if any.
        tick: Tick index when the event occurred.
        payload: Additional structured event data.
    """

    event_type: str
    actor_id: str | None = None
    target_id: str | None = None
    tick: int
    payload: dict[str, Any] = Field(default_factory=dict)


class HistoryEntry(BaseModel):
    """Historical metric snapshot stored after each tick.

    Attributes:
        tick: Tick index.
        delivered_trash: Delivered trash total at this tick.
        collisions: Collision total at this tick.
        marine_life_stress: Aggregated marine-life stress at this tick.
        energy_remaining: Aggregated robot energy at this tick.
        total_score: Computed total score at this tick.
        trash_remaining: Remaining trash count at this tick.
    """

    tick: int
    delivered_trash: int
    collisions: int
    marine_life_stress: float
    energy_remaining: float
    total_score: float
    trash_remaining: int


class SimulationSnapshot(BaseModel):
    """Full simulation payload returned to API clients.

    Attributes:
        tick: Current tick index.
        phase: Current lifecycle phase.
        config: Runtime configuration in effect.
        base: Base position and radius.
        agents: Active agent states.
        stats: Aggregated counts for the current tick.
        score: Score breakdown for the current tick.
        events: Events generated during the current tick.
    """

    tick: int
    phase: str
    config: SimulationConfig
    base: BaseState
    agents: list[AgentState]
    stats: SimulationStats
    score: ScoreState
    events: list[SimulationEvent]
