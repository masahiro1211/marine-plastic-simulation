from __future__ import annotations

import math
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator


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
        trash_source_profile: Preset for source-weighted trash generation.
        trash_cluster_min: Minimum runtime trash cluster size.
        trash_cluster_max: Maximum runtime trash cluster size.
        current_x: Horizontal ocean current direction component.
        current_y: Vertical ocean current direction component.
        current_strength: Strength applied to trash from ocean current.
        diffusion_strength: Random diffusion strength applied to trash.
        convergence_x: Horizontal position of simplified accumulation zone.
        convergence_y: Vertical position of simplified accumulation zone.
        convergence_strength: Pull strength toward the accumulation zone.
        source_outflow_strength: Push strength away from the selected source.
        fish_eat_radius: Range in which marine life incidentally ingests trash.
        flock_zor_radius: Couzin zone-of-repulsion radius between marine life.
        flock_zoo_radius: Couzin zone-of-orientation outer radius.
        flock_zoa_radius: Couzin zone-of-attraction outer radius.
        flock_alignment_weight: Steering weight for zone-of-orientation alignment.
        flock_cohesion_weight: Steering weight for zone-of-attraction cohesion.
        flock_max_turn_rate: Maximum heading change per tick in radians.
        flock_noise: Random heading perturbation added per tick in radians.
        sharing_mode: Strategy for scout-to-collector target sharing.
        scout_search_duration: Empty (b) search ticks before reverting to (a) scan.
        scout_levy_min_steps: Minimum straight-line steps per Lévy leg.
        scout_levy_max_steps: Maximum straight-line steps per Lévy leg.
        scout_levy_mu: Lévy distribution exponent for step length sampling.
        scout_battery_enabled: Whether scouts consume energy and return to base.
        panic_radius: Distance to a robot below which a fish enters panic mode.
        panic_contagion_radius: Distance within which panic spreads between same-species fish.
        panic_heading_noise: Per-fish random heading perturbation while panicking (radians).
        panic_speed_factor: Speed multiplier applied while a fish is panicking.
        panic_separation_weight: Mutual repulsion weight between fish while panicking,
            driving explosive flash expansion of the school.
        panic_burst_factor: Extra speed multiplier at panic onset (startle burst),
            decaying linearly back to 1.0 over panic_burst_ticks.
        panic_burst_ticks: Number of ticks the startle burst decays over.
        predator_count: Number of predators to spawn.
        predator_speed: Base cruise speed of each predator.
        predator_chase_speed_factor: Speed multiplier applied while chasing prey.
        predator_sensor_radius: Detection radius beyond which predators ignore prey.
        predator_panic_radius: Distance to a predator below which a fish enters panic mode.
        predator_preferred_distance: Standoff distance the predator keeps from prey; it
            aims short of the fish and slows to orbit speed once inside this range.
        predator_lunge_factor: Extra chase-speed multiplier when the target fish enters
            panic (predator-side startle response).
        predator_lunge_ticks: Number of ticks the lunge boost decays over.
        predator_cluster_min_size: Minimum cluster size before the predator switches from
            nearest-fish targeting to centroid targeting.
        predator_levy_min_steps: Minimum straight-line ticks per cruise leg.
        predator_levy_max_steps: Maximum straight-line ticks per cruise leg.
        predator_levy_mu: Lévy exponent for cruise leg length sampling.
        predator_wall_repulsion_radius: Distance from world edges below which
            a gradient wall-repulsion force begins steering the predator away.
        predator_wall_repulsion_weight: Strength multiplier for the predator
            wall-repulsion vector.
    """

    model_config = ConfigDict(extra="ignore", allow_inf_nan=False)

    width: float = Field(default=960, ge=240, le=3840)
    height: float = Field(default=640, ge=240, le=2160)
    steps: int = Field(default=6000, ge=1, le=10_000)
    tick_interval_ms: int = Field(default=50, ge=16, le=1000)

    scout_count: int = Field(default=2, ge=0, le=20)
    collector_count: int = Field(default=3, ge=0, le=20)
    marine_life_count: int = Field(default=36, ge=0, le=200)
    initial_trash_count: int = Field(default=18, ge=0, le=500)

    scout_speed: float = Field(default=4.4, ge=0, le=20)
    collector_speed: float = Field(default=3.6, ge=0, le=20)
    marine_life_speed: float = Field(default=3.2, ge=0, le=20)
    trash_drift_speed: float = Field(default=0.35, ge=0, le=10)

    trash_weight: float = Field(default=1.0, ge=0, le=10)
    avoid_marine_life_weight: float = Field(default=1.15, ge=0, le=10)
    avoid_robot_weight: float = Field(default=2.5, ge=0, le=10)
    random_weight: float = Field(default=0.3, ge=0, le=10)

    scout_sensor_radius: float = Field(default=110, ge=0, le=1000)
    collector_sensor_radius: float = Field(default=42, ge=0, le=1000)
    collector_pickup_radius: float = Field(default=16, ge=0, le=500)
    marine_life_avoid_radius: float = Field(default=140, ge=0, le=1000)
    collision_radius: float = Field(default=18, ge=0, le=500)
    base_radius: float = Field(default=48, ge=1, le=500)

    max_energy: float = Field(default=100, ge=1, le=10_000)
    energy_drain_per_tick: float = Field(default=0.55, ge=0, le=1000)
    energy_charge_per_tick: float = Field(default=3.0, ge=0, le=1000)
    return_speed_factor: float = Field(default=0.45, ge=0, le=10)
    low_energy_threshold: float = Field(default=18, ge=0, le=10_000)

    trash_spawn_interval: int = Field(default=24, ge=0, le=10_000)
    max_trash: int = Field(default=30, ge=0, le=500)
    trash_source_profile: Literal["legacy", "calm", "rain", "storm", "harbor"] = "calm"
    trash_cluster_min: int = Field(default=1, ge=1, le=100)
    trash_cluster_max: int = Field(default=3, ge=1, le=100)
    current_x: float = Field(default=0.35, ge=-1, le=1)
    current_y: float = Field(default=0.08, ge=-1, le=1)
    current_strength: float = Field(default=0.08, ge=0, le=10)
    diffusion_strength: float = Field(default=0.02, ge=0, le=10)
    convergence_x: float | None = Field(default=None, ge=0, le=3840)
    convergence_y: float | None = Field(default=None, ge=0, le=2160)
    convergence_strength: float = Field(default=0.004, ge=0, le=10)
    source_outflow_strength: float = Field(default=0.018, ge=0, le=10)

    fish_eat_radius: float = Field(default=14.0, ge=0, le=500)

    flock_zor_radius: float = Field(default=14, ge=0, le=500)
    flock_zoo_radius: float = Field(default=45, ge=0, le=1000)
    flock_zoa_radius: float = Field(default=110, ge=0, le=1000)
    flock_alignment_weight: float = Field(default=0.6, ge=0, le=10)
    flock_cohesion_weight: float = Field(default=0.35, ge=0, le=10)
    flock_max_turn_rate: float = Field(default=0.45, ge=0, le=6.2832)
    flock_noise: float = Field(default=0.08, ge=0, le=6.2832)

    wall_repulsion_radius: float = Field(default=60.0, ge=0, le=1000)
    wall_repulsion_weight: float = Field(default=2.0, ge=0, le=10)

    habitat_drift_weight: float = Field(default=0.0, ge=0, le=10)

    speed_evade_factor: float = Field(default=1.55, ge=0, le=10)
    speed_zor_factor: float = Field(default=0.7, ge=0, le=10)
    speed_adapt_rate: float = Field(default=0.25, ge=0, le=1)

    inter_species_repulsion_radius: float = Field(default=80.0, ge=0, le=1000)
    inter_species_repulsion_weight: float = Field(default=2.5, ge=0, le=10)

    panic_radius: float = Field(default=45.0, ge=0, le=1000)
    panic_contagion_radius: float = Field(default=60.0, ge=0, le=1000)
    panic_heading_noise: float = Field(default=0.4, ge=0, le=6.2832)
    panic_speed_factor: float = Field(default=2.0, ge=0, le=10)
    panic_separation_weight: float = Field(default=2.5, ge=0, le=10)
    panic_burst_factor: float = Field(default=1.5, ge=1, le=5)
    panic_burst_ticks: int = Field(default=6, ge=0, le=100)

    predator_count: int = Field(default=1, ge=0, le=20)
    predator_speed: float = Field(default=3.0, ge=0, le=20)
    predator_chase_speed_factor: float = Field(default=1.7, ge=0, le=10)
    predator_max_turn_rate: float = Field(default=0.15, ge=0, le=math.pi)
    predator_sensor_radius: float = Field(default=200.0, ge=0, le=1000)
    predator_panic_radius: float = Field(default=85.0, ge=0, le=1000)
    predator_preferred_distance: float = Field(default=45.0, ge=0, le=500)
    predator_lunge_factor: float = Field(default=1.5, ge=1, le=5)
    predator_lunge_ticks: int = Field(default=8, ge=0, le=100)
    predator_cluster_min_size: int = Field(default=3, ge=1, le=200)
    predator_levy_min_steps: int = Field(default=30, ge=1, le=10_000)
    predator_levy_max_steps: int = Field(default=180, ge=1, le=10_000)
    predator_levy_mu: float = Field(default=2.0, ge=1, le=5)
    predator_wall_repulsion_radius: float = Field(default=60.0, ge=0, le=1000)
    predator_wall_repulsion_weight: float = Field(default=2.5, ge=0, le=10)

    sharing_mode: Literal["global", "local"] = "global"
    enable_manual_robot: bool = True
    manual_penalty_ticks: int = Field(default=50, ge=0, le=10_000)
    collision_cooldown_ticks: int = Field(default=30, ge=0, le=10_000)
    scout_search_duration: int = Field(default=20, ge=0, le=10_000)
    scout_levy_min_steps: int = Field(default=30, ge=1, le=10_000)
    scout_levy_max_steps: int = Field(default=180, ge=1, le=10_000)
    scout_levy_mu: float = Field(default=2.0, ge=1, le=5)
    scout_battery_enabled: bool = False

    @model_validator(mode="after")
    def validate_ordered_ranges(self) -> SimulationConfig:
        """Reject internally inconsistent ranges before they reach the engine."""
        if self.trash_cluster_max < self.trash_cluster_min:
            raise ValueError("trash_cluster_max must be greater than or equal to trash_cluster_min")
        if self.scout_levy_max_steps < self.scout_levy_min_steps:
            raise ValueError("scout_levy_max_steps must be greater than or equal to scout_levy_min_steps")
        if self.predator_levy_max_steps < self.predator_levy_min_steps:
            raise ValueError("predator_levy_max_steps must be greater than or equal to predator_levy_min_steps")
        if self.low_energy_threshold > self.max_energy:
            raise ValueError("low_energy_threshold must be less than or equal to max_energy")
        return self


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
        robot_fish_contacts: Cumulative robot-fish proximity entries.
        fish_ate_trash: Cumulative trash items ingested by marine life.
    """

    scouts: int
    collectors: int
    marine_life: int
    trash_remaining: int
    active_robots: int
    delivered_trash: int
    robot_fish_contacts: int = 0
    fish_ate_trash: int = 0


class ScoreState(BaseModel):
    """Score breakdown for the current tick.

    Attributes:
        total: Total computed score.
        trash_delivered: Delivered trash contribution.
        collisions: Collision penalty contribution.
        energy_remaining: Remaining energy bonus contribution.
    """

    total: float
    trash_delivered: int
    collisions: int
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
        energy_remaining: Aggregated robot energy at this tick.
        total_score: Computed total score at this tick.
        trash_remaining: Remaining trash count at this tick.
    """

    tick: int
    delivered_trash: int
    collisions: int
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
        discovered_trash_ids: Trash IDs that scouts have reported.
    """

    tick: int
    phase: str
    config: SimulationConfig
    base: BaseState
    agents: list[AgentState]
    stats: SimulationStats
    score: ScoreState
    events: list[SimulationEvent]
    discovered_trash_ids: list[str] = []
