from __future__ import annotations

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
from app.simulation.agents import BaseAgent, Collector, MarineLife, Scout, Trash


MAX_HISTORY = 500


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
        self.delivered_trash = 0
        self.collisions = 0
        self.pending_marine_life_respawns: list[int] = []
        self._init_agents()

    def _init_agents(self) -> None:
        """Rebuild all runtime actors from the current configuration."""
        BaseAgent.reset_id_counter()
        self.agents.clear()
        self.shared_targets.clear()
        self.current_events.clear()
        self.pending_marine_life_respawns.clear()
        self.delivered_trash = 0
        self.collisions = 0
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
        #  追加：手動ロボットのスポーン 
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
        for _ in range(self.config.marine_life_count):
            self._spawn_marine_life()
        for _ in range(self.config.initial_trash_count):
            self._spawn_trash()

    def _spawn_trash(self) -> None:
        """Spawn one trash actor at a random valid position."""
        self.agents.append(
            Trash(
                random.uniform(30, self.config.width - 30),
                random.uniform(20, self.config.height - 120),
                self.config.trash_drift_speed,
            )
        )

    def _spawn_marine_life(self) -> None:
        """Spawn one marine life actor at a random valid position."""
        self.agents.append(
            MarineLife(
                random.uniform(30, self.config.width - 30),
                random.uniform(20, self.config.height - 120),
                self.config.marine_life_speed,
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

        self._spawn_runtime_trash()
        self._respawn_marine_life_if_due()

        for trash in self.trash_items:
            trash.update(self)
        for scout in self.scouts:
            scout.update(self)
        for collector in self.collectors:
            collector.update(self)
        for marine_life in self.marine_life:
            marine_life.update(self)

        self._resolve_base_interactions()
        self._resolve_collisions()
        self._cleanup_shared_targets()
        self._record_history()

        if self.tick >= self.config.steps:
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
        if collector.carrying_trash_id or not trash.alive:
            return
        trash.alive = False
        collector.carrying_trash_id = trash.id
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
            getattr(robot, "carrying_trash_id", None)
            or robot.energy <= self.config.low_energy_threshold
            or robot.energy <= 0
        )

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

    def mark_marine_life_lost(self, agent: MarineLife) -> None:
        """Deactivate stressed marine life and schedule respawn.

        Args:
            agent: Marine life actor to mark as lost.
        """
        if not agent.alive:
            return
        agent.alive = False
        agent.status = "lost"
        self.pending_marine_life_respawns.append(self.tick + self.config.marine_life_respawn_delay)
        self.current_events.append(
            SimulationEvent(
                event_type="marine_life_lost",
                actor_id=agent.id,
                tick=self.tick,
                payload={"stress": round(agent.stress, 2)},
            )
        )

    def _respawn_marine_life_if_due(self) -> None:
        """Respawn marine life actors whose delay has elapsed."""
        remaining_due = []
        for due_tick in self.pending_marine_life_respawns:
            if due_tick <= self.tick:
                self._spawn_marine_life()
                self.current_events.append(
                    SimulationEvent(
                        event_type="marine_life_respawned",
                        tick=self.tick,
                    )
                )
            else:
                remaining_due.append(due_tick)
        self.pending_marine_life_respawns = remaining_due

    def _spawn_runtime_trash(self) -> None:
        """Spawn periodic runtime trash when configuration allows it."""
        if self.config.trash_spawn_interval <= 0:
            return
        if self.tick % self.config.trash_spawn_interval != 0:
            return
        if len(self.trash_items) >= self.config.max_trash:
            return
        self._spawn_trash()

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
            if isinstance(robot, Collector) and robot.carrying_trash_id:
                delivered_id = robot.carrying_trash_id
                robot.carrying_trash_id = None
                robot.status = "charging"
                self.delivered_trash += 1
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
                    # 追加：他ロボットとの衝突ペナルティ 
                    if getattr(robot, "is_manual", False):
                        robot.apply_collision_penalty()
                    if getattr(other, "is_manual", False):
                        other.apply_collision_penalty()
                    # ここまで 
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
        )

    def _current_score(self) -> ScoreState:
        """Compute the current score breakdown.

        Returns:
            Current score state.
        """
        energy_remaining = round(sum(robot.energy for robot in self.scouts + self.collectors), 2)
        marine_stress = round(sum(agent.stress for agent in self.marine_life), 2)
        total = round(
            self.delivered_trash * 12
            - self.collisions * 2
            - marine_stress * 1.5
            + energy_remaining * 0.05,
            2,
        )
        return ScoreState(
            total=total,
            trash_delivered=self.delivered_trash,
            collisions=self.collisions,
            marine_life_stress=marine_stress,
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
                marine_life_stress=score.marine_life_stress,
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
        snapshot = SimulationSnapshot(
            tick=self.tick,
            phase=self.phase,
            config=self.config,
            base=self.base,
            agents=[agent.to_state() for agent in self.agents if agent.alive],
            stats=self._current_stats(),
            score=self._current_score(),
            events=self.current_events,
        )
        return snapshot.model_dump()

    def get_stats_history(self) -> list[dict]:
        """Return recorded per-tick history entries.

        Returns:
            Serialized history entries.
        """
        return [entry.model_dump() for entry in self.stats_history]
