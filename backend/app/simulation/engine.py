from __future__ import annotations

import math
import random
from collections import deque
from dataclasses import dataclass

from app.models.schemas import (
    BaseState,
    HistoryEntry,
    ScoreState,
    SimulationConfig,
    SimulationEvent,
    SimulationSnapshot,
    SimulationStats,
)
from app.simulation.agents import BaseAgent, Collector, MarineLife, Predator, Scout, Trash


MAX_HISTORY = 500
SCORE_PER_DELIVERED_TRASH = 100
COLLISION_SCORE_PENALTY = 20
COLLECTOR_UPGRADE_SCORE = 500
COMPLETION_SCORE = 1000
COLLECTOR_UPGRADE_SPEED_MULTIPLIER = 1.6
COLLECTOR_UPGRADE_CAPACITY = 2


@dataclass
class SharedTarget:
    """Shared trash location discovered by a scout.

    Attributes:
        trash_id: Identifier of the detected trash.
        x: Observed horizontal position.
        y: Observed vertical position.
        reporter_id: Scout identifier that reported the trash.
        tick: Tick when the report was created.
    """

    trash_id: str
    x: float
    y: float
    reporter_id: str
    tick: int


@dataclass(frozen=True)
class TrashSource:
    """Active trash input source with pressure-driven ABM emission dynamics."""

    source_id: str
    x: float
    y: float
    weight: float
    spread_radius: float
    retention: float
    volatility: float


class SimulationEngine:
    """Main simulation runtime for the robot cleanup game.

    This runtime owns world state, agent updates, event emission, score
    calculation, and snapshot generation for API clients.
    """

    def __init__(self, config: SimulationConfig | None = None):
        """Initialize the simulation runtime.

        Args:
            config: Optional runtime configuration override.
        """
        self.config = config or SimulationConfig()
        self.tick = 0
        self.running = False
        self.phase = "idle"
        self.base = BaseState(
            x=self.config.width / 2,
            y=max(self.config.height - 36, 0),
            radius=self.config.base_radius,
        )
        self.agents: list[BaseAgent] = []
        self.shared_targets: dict[str, SharedTarget] = {}
        self.current_events: list[SimulationEvent] = []
        self.stats_history: deque[HistoryEntry] = deque(maxlen=MAX_HISTORY)
        self._recent_collision_pairs: dict[tuple[str, str], int] = {}
        self.delivered_trash = 0
        self.collisions = 0
        self.robot_fish_contacts = 0
        self.fish_ate_trash = 0
        self.fish_eat_probability = 0.0
        self._fish_eat_probability_second = -1
        self._trash_source_pressure: dict[str, float] = {}
        self._init_agents()

    def _init_agents(self) -> None:
        """Rebuild all runtime actors from the current configuration."""
        BaseAgent.reset_id_counter()
        self.agents.clear()
        self.shared_targets.clear()
        self.current_events.clear()
        self._recent_collision_pairs.clear()
        self.delivered_trash = 0
        self.collisions = 0
        self.robot_fish_contacts = 0
        self.fish_ate_trash = 0
        self.fish_eat_probability = 0.0
        self._fish_eat_probability_second = -1
        self._trash_source_pressure = {
            source.source_id: random.uniform(0.0, max(source.weight, 0.0) * 0.6)
            for source in self._trash_sources()
        }
        self.base = BaseState(
            x=self.config.width / 2,
            y=max(self.config.height - 36, 0),
            radius=self.config.base_radius,
        )
        for _ in range(self.config.scout_count):
            self.agents.append(
                Scout(
                    random.uniform(40, self.config.width - 40),
                    random.uniform(self.config.height * 0.45, self.config.height - 80),
                    self.config.scout_speed,
                    self.config.scout_sensor_radius,
                    self.config.max_energy,
                )
            )
        if self.config.enable_manual_robot:
            manual = Collector(
                self.config.width / 2,
                self.config.height / 2,
                self.config.collector_speed,
                self.config.collector_sensor_radius,
                self.config.collector_pickup_radius,
                self.config.max_energy,
            )
            manual.is_manual = True
            self.agents.append(manual)
        for _ in range(self.config.collector_count):
            self.agents.append(
                Collector(
                    random.uniform(40, self.config.width - 40),
                    random.uniform(self.config.height * 0.45, self.config.height - 80),
                    self.config.collector_speed,
                    self.config.collector_sensor_radius,
                    self.config.collector_pickup_radius,
                    self.config.max_energy,
                )
            )
        for i in range(self.config.marine_life_count):
            self._spawn_marine_life(species_id=i % 3)
        for _ in range(self.config.predator_count):
            self._spawn_predator()
        for _ in range(self.config.initial_trash_count):
            self._spawn_trash_from_source()

    def _spawn_trash(self, source: TrashSource | None = None) -> None:
        """Spawn one trash actor at a valid source-aware position."""
        if source is None:
            x = random.uniform(30, self.config.width - 30)
            y = random.uniform(20, self.config.height - 120)
            source_id = "legacy"
            source_x = x
            source_y = y
        else:
            angle = random.uniform(0, math.tau)
            distance = random.uniform(0, source.spread_radius)
            x = source.x + math.cos(angle) * distance
            y = source.y + math.sin(angle) * distance
            x = min(max(x, 30), self.config.width - 30)
            y = min(max(y, 20), self.config.height - 120)
            source_id = source.source_id
            source_x = source.x
            source_y = source.y
        self.agents.append(
            Trash(
                x,
                y,
                self.config.trash_drift_speed,
                source_id=source_id,
                source_x=source_x,
                source_y=source_y,
            )
        )

    def _spawn_trash_from_source(self) -> None:
        """Spawn one trash actor from the configured source profile."""
        if self.config.trash_source_profile == "legacy":
            self._spawn_trash()
            return
        self._spawn_trash(self._select_trash_source())

    def _spawn_predator(self) -> None:
        """Spawn one predator at a random interior position."""
        self.agents.append(
            Predator(
                random.uniform(60, self.config.width - 60),
                random.uniform(60, self.config.height - 60),
                self.config.predator_speed,
            )
        )

    def _spawn_marine_life(self, species_id: int = 0) -> None:
        """Spawn one marine life actor at a random position in the world.

        All species spawn uniformly. Group separation emerges dynamically
        from inter-species repulsion rather than fixed habitat zones.

        Args:
            species_id: Species group index (0, 1, or 2).
        """
        self.agents.append(
            MarineLife(
                random.uniform(30, self.config.width - 30),
                random.uniform(20, self.config.height - 120),
                self.config.marine_life_speed,
                species_id=species_id,
            )
        )

    def start(self) -> None:
        """Start or resume the simulation."""
        self.running = True
        self.phase = "running"

    def stop(self) -> None:
        """Stop the simulation while preserving current state."""
        self.running = False
        if self.phase == "running":
            self.phase = "stopped"

    def reset(self, config: SimulationConfig | None = None) -> None:
        """Reset runtime state and optionally replace the configuration.

        Args:
            config: Optional new runtime configuration.
        """
        if config:
            self.config = config
        self.tick = 0
        self.running = False
        self.phase = "idle"
        self.stats_history.clear()
        self._init_agents()

    def step(self) -> None:
        """Advance the full simulation by one tick."""
        if self.phase == "completed":
            self.running = False
            return
        if self.phase == "idle":
            self.phase = "running"

        self.tick += 1
        self.current_events = []
        self._update_fish_eat_probability()

        self._spawn_runtime_trash()

        for trash in self.trash_items:
            trash.update(self)
        for scout in self.scouts:
            scout.update(self)
        for collector in self.collectors:
            collector.update(self)
        for predator in self.predators:
            predator.update(self)
        marine_life_list = self.marine_life
        prev_panic_map = {fish.id: fish.panic for fish in marine_life_list}
        for fish in marine_life_list:
            fish.panic = fish.compute_panic(self, self.config, prev_panic_map)
        for fish in marine_life_list:
            fish.update(self)

        self._resolve_collisions()
        self._resolve_base_interactions()
        self._sync_collector_upgrades()
        self._cleanup_shared_targets()
        self._record_history()

        if self._current_score().total >= COMPLETION_SCORE:
            self.phase = "completed"
            self.running = False
        elif self.tick >= self.config.steps:
            self.phase = "completed"
            self.running = False

    @property
    def scouts(self) -> list[Scout]:
        """Return all active scout robots."""
        return [agent for agent in self.agents if isinstance(agent, Scout) and agent.alive]

    @property
    def collectors(self) -> list[Collector]:
        """Return all active collector robots."""
        return [agent for agent in self.agents if isinstance(agent, Collector) and agent.alive]

    @property
    def marine_life(self) -> list[MarineLife]:
        """Return all active marine life actors."""
        return [agent for agent in self.agents if isinstance(agent, MarineLife) and agent.alive]

    @property
    def predators(self) -> list[Predator]:
        """Return all active predator actors."""
        return [agent for agent in self.agents if isinstance(agent, Predator) and agent.alive]

    @property
    def trash_items(self) -> list[Trash]:
        """Return all active trash actors."""
        return [agent for agent in self.agents if isinstance(agent, Trash) and agent.alive]

    def find_trash_near(self, x: float, y: float, radius: float) -> list[Trash]:
        """Find active trash within a radius of a point.

        Args:
            x: Query horizontal position.
            y: Query vertical position.
            radius: Search radius.

        Returns:
            Matching trash actors.
        """
        return [
            trash
            for trash in self.trash_items
            if trash.distance_to_point(x, y) <= radius
        ]

    def find_robots_near(self, x: float, y: float, radius: float) -> list[BaseAgent]:
        """Find active robots within a radius of a point.

        Args:
            x: Query horizontal position.
            y: Query vertical position.
            radius: Search radius.

        Returns:
            Matching scout and collector robots.
        """
        robots = self.scouts + self.collectors
        return [robot for robot in robots if robot.distance_to_point(x, y) <= radius]

    def find_marine_life_near(self, x: float, y: float, radius: float) -> list[MarineLife]:
        """Find active marine life within a radius of a point.

        Args:
            x: Query horizontal position.
            y: Query vertical position.
            radius: Search radius.

        Returns:
            Matching marine life actors.
        """
        return [life for life in self.marine_life if life.distance_to_point(x, y) <= radius]

    def find_predators_near(self, x: float, y: float, radius: float) -> list[Predator]:
        """Find active predators within a radius of a point.

        Args:
            x: Query horizontal position.
            y: Query vertical position.
            radius: Search radius.

        Returns:
            Matching predator actors.
        """
        return [pred for pred in self.predators if pred.distance_to_point(x, y) <= radius]

    def _trash_sources(self) -> list[TrashSource]:
        """Build source presets for the current world and profile."""
        width = self.config.width
        height = self.config.height
        weights_by_profile = {
            "calm": {
                "river_mouth": 2.0,
                "coastal_city": 1.5,
                "harbor": 1.0,
                "offshore": 0.8,
            },
            "rain": {
                "river_mouth": 5.0,
                "coastal_city": 1.8,
                "harbor": 1.0,
                "offshore": 0.6,
            },
            "storm": {
                "river_mouth": 3.5,
                "coastal_city": 2.0,
                "harbor": 1.8,
                "offshore": 2.8,
            },
            "harbor": {
                "river_mouth": 1.0,
                "coastal_city": 1.5,
                "harbor": 5.0,
                "offshore": 0.5,
            },
        }
        weights = weights_by_profile.get(
            self.config.trash_source_profile,
            weights_by_profile["calm"],
        )
        return [
            TrashSource("river_mouth", width * 0.18, height * 0.20, weights["river_mouth"], 48, 0.72, 0.35),
            TrashSource("coastal_city", width * 0.82, height * 0.34, weights["coastal_city"], 64, 0.58, 0.28),
            TrashSource("harbor", width * 0.50, max(height - 110, 30), weights["harbor"], 42, 0.46, 0.22),
            TrashSource("offshore", width * 0.50, 26, weights["offshore"], 120, 0.35, 0.42),
        ]

    def _select_trash_source(self) -> TrashSource:
        """Select a trash source by configured source weights."""
        sources = self._trash_sources()
        total = sum(max(source.weight, 0.0) for source in sources)
        if total <= 0:
            return sources[0]
        threshold = random.uniform(0, total)
        cumulative = 0.0
        for source in sources:
            cumulative += max(source.weight, 0.0)
            if threshold <= cumulative:
                return source
        return sources[-1]

    def _runtime_trash_cluster_size(self) -> int:
        """Return runtime trash cluster size for the current profile."""
        lower = max(1, self.config.trash_cluster_min)
        upper = max(lower, self.config.trash_cluster_max)
        profile_bonus = {
            "legacy": 0,
            "calm": 0,
            "rain": 1,
            "storm": 2,
            "harbor": 1,
        }.get(self.config.trash_source_profile, 0)
        return random.randint(lower, upper) + profile_bonus

    def _simulation_second(self) -> int:
        """Return the current wall-clock second represented by the tick counter."""
        return int((self.tick * self.config.tick_interval_ms) / 1000)

    def _update_fish_eat_probability(self) -> None:
        """Refresh the fish ingestion probability once per simulated second."""
        second = self._simulation_second()
        if second == self._fish_eat_probability_second:
            return
        self._fish_eat_probability_second = second
        self.fish_eat_probability = random.random()

    def _source_environment_multiplier(self, source: TrashSource) -> float:
        """Return a profile- and time-dependent source pressure multiplier.

        The terms are intentionally simple but grounded in the literature:
        riverine plastic inputs scale with runoff/rainfall and land-use pressure,
        while transport and transformation after entry are affected by currents,
        wind, waves, dispersion, fragmentation, beaching, and sinking.
        """
        seconds = self._simulation_second()
        cycle = math.sin((seconds / 9.0) + len(source.source_id))
        multiplier = 1.0 + 0.25 * cycle

        if self.config.trash_source_profile == "rain":
            if source.source_id == "river_mouth":
                multiplier *= 2.1
            elif source.source_id == "coastal_city":
                multiplier *= 1.35
        elif self.config.trash_source_profile == "storm":
            multiplier *= 1.65
            if source.source_id in {"offshore", "harbor"}:
                multiplier *= 1.35
        elif self.config.trash_source_profile == "harbor":
            multiplier *= 1.85 if source.source_id == "harbor" else 0.85

        jitter = random.uniform(-source.volatility, source.volatility)
        return max(0.05, multiplier + jitter)

    def _update_trash_source_pressures(self) -> None:
        """Accumulate latent source pressure before runtime trash emission."""
        for source in self._trash_sources():
            previous = self._trash_source_pressure.get(source.source_id, 0.0)
            inflow = max(source.weight, 0.0) * self._source_environment_multiplier(source)
            retained = previous * source.retention
            self._trash_source_pressure[source.source_id] = min(24.0, retained + inflow)

    def _spawn_trash_burst_from_source(self, source: TrashSource, available_slots: int) -> int:
        """Release a pressure-driven cluster from one source agent."""
        pressure = self._trash_source_pressure.get(source.source_id, 0.0)
        threshold = 3.0
        if pressure < threshold and random.random() > pressure / threshold:
            return 0

        base_cluster = self._runtime_trash_cluster_size()
        pressure_bonus = min(4, int(pressure // threshold))
        count = min(available_slots, base_cluster + pressure_bonus)
        if count <= 0:
            return 0
        for _ in range(count):
            self._spawn_trash(source)
        self._trash_source_pressure[source.source_id] = max(0.0, pressure - count * threshold)
        return count

    def trash_current_vector(self) -> tuple[float, float]:
        """Return global current velocity contribution for trash."""
        norm = math.hypot(self.config.current_x, self.config.current_y)
        if norm == 0:
            return (0.0, 0.0)
        strength = self.config.current_strength
        if self.config.trash_source_profile == "storm":
            strength *= 1.8
        return (
            self.config.current_x / norm * strength,
            self.config.current_y / norm * strength,
        )

    def trash_source_outflow(self, trash: Trash) -> tuple[float, float]:
        """Return weak outflow away from the trash source."""
        dx = trash.x - trash.source_x
        dy = trash.y - trash.source_y
        norm = math.hypot(dx, dy)
        if norm == 0:
            return (0.0, 0.0)
        strength = self.config.source_outflow_strength
        return (dx / norm * strength, dy / norm * strength)

    def trash_convergence_pull(self, trash: Trash) -> tuple[float, float]:
        """Return weak pull toward a simplified accumulation zone."""
        target_x = self.config.convergence_x
        target_y = self.config.convergence_y
        if target_x is None:
            target_x = self.config.width * 0.62
        if target_y is None:
            target_y = self.config.height * 0.38
        dx = target_x - trash.x
        dy = target_y - trash.y
        norm = math.hypot(dx, dy)
        if norm == 0:
            return (0.0, 0.0)
        strength = self.config.convergence_strength
        return (dx / norm * strength, dy / norm * strength)

    def share_target(self, trash: Trash, reporter: Scout) -> None:
        """Publish a trash detection event for collectors.

        Args:
            trash: Detected trash actor.
            reporter: Scout that reported the target.
        """
        existing = self.shared_targets.get(trash.id)
        if existing is not None and self.tick - existing.tick <= 1:
            return
        self.shared_targets[trash.id] = SharedTarget(
            trash_id=trash.id,
            x=trash.x,
            y=trash.y,
            reporter_id=reporter.id,
            tick=self.tick,
        )
        self.current_events.append(
            SimulationEvent(
                event_type="trash_detected",
                actor_id=reporter.id,
                target_id=trash.id,
                tick=self.tick,
                payload={"sharing_mode": self.config.sharing_mode},
            )
        )

    def find_collector_target(self, collector: Collector) -> Trash | None:
        """Select the best trash target for a collector.

        Args:
            collector: Collector requesting a target.

        Returns:
            Closest local or shared trash target, if one exists.
        """
        local_trash = self.find_trash_near(collector.x, collector.y, collector.sensor_radius)
        if local_trash:
            return min(local_trash, key=collector.distance_to)

        candidates = [
            trash
            for trash in self.trash_items
            if trash.id in self.shared_targets
        ]
        if candidates:
            return min(candidates, key=collector.distance_to)
        return None

    def pick_trash(self, collector: Collector, trash: Trash) -> None:
        """Mark one trash item as collected by a collector.

        Args:
            collector: Collector performing the pickup.
            trash: Trash actor being collected.
        """
        if len(collector.carrying_trash_ids) >= self.collector_carrying_capacity() or not trash.alive:
            return
        trash.alive = False
        collector.carrying_trash_ids.append(trash.id)
        if len(collector.carrying_trash_ids) >= self.collector_carrying_capacity():
            collector.target_id = "base"
        self.shared_targets.pop(trash.id, None)
        self.current_events.append(
            SimulationEvent(
                event_type="trash_picked",
                actor_id=collector.id,
                target_id=trash.id,
                tick=self.tick,
            )
        )

    def should_return_to_base(self, robot: BaseAgent) -> bool:
        """Return whether a robot should head back to base.

        Args:
            robot: Robot to evaluate.

        Returns:
            True when the robot is carrying trash or low on energy.
        """
        return bool(
            getattr(robot, "carrying_trash_ids", None)
            or getattr(robot, "carrying_trash_id", None)
            or robot.energy <= self.config.low_energy_threshold
            or robot.energy <= 0
        )

    def collector_upgrade_stage(self) -> int:
        """Return the current score-based collector upgrade stage."""
        return 1 if self._current_score().total >= COLLECTOR_UPGRADE_SCORE else 0

    def collector_speed_multiplier(self) -> float:
        """Return the active collector speed multiplier."""
        return COLLECTOR_UPGRADE_SPEED_MULTIPLIER if self.collector_upgrade_stage() >= 1 else 1.0

    def collector_carrying_capacity(self) -> int:
        """Return the active collector trash capacity."""
        return COLLECTOR_UPGRADE_CAPACITY if self.collector_upgrade_stage() >= 1 else 1

    def _sync_collector_upgrades(self) -> None:
        """Apply score-derived collector stage to serialized runtime state."""
        upgraded = self.collector_upgrade_stage() >= 1
        multiplier = self.collector_speed_multiplier()
        for collector in self.collectors:
            collector.is_upgraded = upgraded
            collector.speed = collector.base_speed * multiplier

    def apply_robot_avoidance(self, robot: BaseAgent) -> None:
        """Adjust velocity to reduce robot-to-robot crowding.

        Args:
            robot: Robot receiving avoidance steering.
        """
        nearby_robots = [
            other
            for other in self.scouts + self.collectors
            if other is not robot and other.distance_to(robot) <= self.config.collision_radius * 2
        ]
        if not nearby_robots:
            return
        avg_x = sum(other.x for other in nearby_robots) / len(nearby_robots)
        avg_y = sum(other.y for other in nearby_robots) / len(nearby_robots)
        robot.vx += (robot.x - avg_x) * 0.02 * self.config.avoid_robot_weight
        robot.vy += (robot.y - avg_y) * 0.02 * self.config.avoid_robot_weight
        robot.clamp_speed(getattr(robot, "speed", 1.0))

    def apply_marine_life_avoidance(self, robot: BaseAgent) -> None:
        """Adjust velocity to reduce interaction with marine life.

        Args:
            robot: Robot receiving avoidance steering.
        """
        nearby_life = [
            life
            for life in self.marine_life
            if life.distance_to(robot) <= self.config.marine_life_avoid_radius
        ]
        if not nearby_life:
            return
        avg_x = sum(life.x for life in nearby_life) / len(nearby_life)
        avg_y = sum(life.y for life in nearby_life) / len(nearby_life)
        robot.vx += (robot.x - avg_x) * 0.015 * self.config.avoid_marine_life_weight
        robot.vy += (robot.y - avg_y) * 0.015 * self.config.avoid_marine_life_weight
        robot.clamp_speed(getattr(robot, "speed", 1.0))

    def drain_energy(self, robot: BaseAgent) -> None:
        """Consume robot energy for one tick and emit depletion events.

        Args:
            robot: Robot whose energy should be drained.
        """
        if robot.energy > 0:
            robot.energy = max(0.0, robot.energy - self.config.energy_drain_per_tick)
            if robot.energy == 0:
                self.current_events.append(
                    SimulationEvent(
                        event_type="battery_depleted",
                        actor_id=robot.id,
                        tick=self.tick,
                    )
                )

    def fish_eats_trash(self, fish: MarineLife, trash: Trash) -> None:
        """Deactivate trash ingested by a marine life actor.

        Args:
            fish: Marine life actor performing the ingestion.
            trash: Trash actor being removed from the world.
        """
        if not trash.alive:
            return
        trash.alive = False
        self.shared_targets.pop(trash.id, None)
        self.fish_ate_trash += 1
        fish.ate_trash_count += 1

    def _spawn_runtime_trash(self) -> None:
        """Spawn runtime trash from pressure-driven source agents."""
        if self.config.trash_spawn_interval <= 0:
            return
        if self.tick % self.config.trash_spawn_interval != 0:
            return
        available_slots = self.config.max_trash - len(self.trash_items)
        if available_slots <= 0:
            return
        if self.config.trash_source_profile == "legacy":
            self._spawn_trash()
            return
        self._update_trash_source_pressures()
        sources = self._trash_sources()
        random.shuffle(sources)
        sources.sort(
            key=lambda source: self._trash_source_pressure.get(source.source_id, 0.0),
            reverse=True,
        )
        for source in sources:
            if available_slots <= 0:
                return
            spawned = self._spawn_trash_burst_from_source(source, available_slots)
            available_slots -= spawned

    def _resolve_base_interactions(self) -> None:
        """Apply charging and trash delivery for robots inside base range."""
        for robot in self.scouts + self.collectors:
            if robot.distance_to_point(self.base.x, self.base.y) > self.base.radius:
                continue
            if robot.energy < self.config.max_energy:
                before = robot.energy
                robot.energy = min(self.config.max_energy, robot.energy + self.config.energy_charge_per_tick)
                if before == 0 and robot.energy > 0:
                    self.current_events.append(
                        SimulationEvent(
                            event_type="battery_recovered",
                            actor_id=robot.id,
                            tick=self.tick,
                        )
                    )
            if isinstance(robot, Collector) and robot.carrying_trash_ids:
                delivered_ids = list(robot.carrying_trash_ids)
                robot.carrying_trash_ids.clear()
                robot.status = "charging"
                self.delivered_trash += len(delivered_ids)
                for delivered_id in delivered_ids:
                    self.current_events.append(
                        SimulationEvent(
                            event_type="trash_delivered",
                            actor_id=robot.id,
                            target_id=delivered_id,
                            tick=self.tick,
                        )
                    )

    def _resolve_collisions(self) -> None:
        """Detect robot collisions and emit collision events."""
        robots = self.scouts + self.collectors
        for index, robot in enumerate(robots):
            for other in robots[index + 1 :]:
                if robot.distance_to(other) <= self.config.collision_radius:
                    pair = tuple(sorted([robot.id, other.id]))
                    last_tick = self._recent_collision_pairs.get(pair, -10**9)

                    # 前回の衝突からクールダウン期間が経過していなければスキップ
                    if self.tick - last_tick < self.config.collision_cooldown_ticks:
                        continue

                    # 衝突したtickを記録
                    self._recent_collision_pairs[pair] = self.tick
                    if getattr(robot, "is_manual", False):
                        robot.apply_collision_penalty(self.config.manual_penalty_ticks)
                    if getattr(other, "is_manual", False):
                        other.apply_collision_penalty(self.config.manual_penalty_ticks)
                    self.collisions += 1
                    self.current_events.append(
                        SimulationEvent(
                            event_type="collision_detected",
                            actor_id=robot.id,
                            target_id=other.id,
                            tick=self.tick,
                        )
                    )

    def _cleanup_shared_targets(self) -> None:
        """Drop shared targets that no longer correspond to active trash."""
        active_trash_ids = {trash.id for trash in self.trash_items}
        self.shared_targets = {
            target_id: target
            for target_id, target in self.shared_targets.items()
            if target_id in active_trash_ids
        }

    def _current_stats(self) -> SimulationStats:
        """Build aggregated counters for the current tick.

        Returns:
            Current simulation statistics.
        """
        return SimulationStats(
            scouts=len(self.scouts),
            collectors=len(self.collectors),
            marine_life=len(self.marine_life),
            trash_remaining=len(self.trash_items),
            active_robots=sum(1 for robot in self.scouts + self.collectors if robot.energy > 0),
            delivered_trash=self.delivered_trash,
            robot_fish_contacts=self.robot_fish_contacts,
            fish_ate_trash=self.fish_ate_trash,
        )

    def _current_score(self) -> ScoreState:
        """Compute the current score breakdown.

        Returns:
            Current score state.
        """
        energy_remaining = round(sum(robot.energy for robot in self.scouts + self.collectors), 2)
        total = round(
            self.delivered_trash * SCORE_PER_DELIVERED_TRASH
            - self.collisions * COLLISION_SCORE_PENALTY,
            2,
        )
        return ScoreState(
            total=total,
            trash_delivered=self.delivered_trash,
            collisions=self.collisions,
            energy_remaining=energy_remaining,
        )

    def _record_history(self) -> None:
        """Append the current score and counts to history."""
        score = self._current_score()
        stats = self._current_stats()
        self.stats_history.append(
            HistoryEntry(
                tick=self.tick,
                delivered_trash=score.trash_delivered,
                collisions=score.collisions,
                energy_remaining=score.energy_remaining,
                total_score=score.total,
                trash_remaining=stats.trash_remaining,
            )
        )

    def get_snapshot(self) -> dict:
        """Serialize the current world state for API clients.

        Returns:
            Snapshot payload as a plain dictionary.
        """
        self._sync_collector_upgrades()
        snapshot = SimulationSnapshot(
            tick=self.tick,
            phase=self.phase,
            config=self.config,
            base=self.base,
            agents=[agent.to_state() for agent in self.agents if agent.alive],
            stats=self._current_stats(),
            score=self._current_score(),
            events=self.current_events,
            discovered_trash_ids=list(self.shared_targets.keys()),
        )
        return snapshot.model_dump()

    def get_stats_history(self) -> list[dict]:
        """Return recorded per-tick history entries.

        Returns:
            Serialized history entries.
        """
        return [entry.model_dump() for entry in self.stats_history]
