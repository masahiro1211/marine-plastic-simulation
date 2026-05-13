from __future__ import annotations

import math
import random

from app.simulation.agents.base import BaseAgent


class Predator(BaseAgent):
    """Lone predator that cruises with Lévy flights and chases nearby fish.

    Two-mode behaviour:
      - cruise: Lévy walk legs (Viswanathan et al. 1999) when no prey is in
        sensor range.  Heading reflects off world boundaries to keep legs
        in-bounds.
      - chase: targeted pursuit of the nearest marine_life within
        ``predator_sensor_radius`` at ``predator_chase_speed_factor`` × base.

    The predator does not eat or otherwise damage prey; its sole role is to
    keep the marine_life flash-expansion behaviour engaged.
    """

    AGENT_TYPE = "predator"
    ROLE = "predator"
    DEFAULT_RADIUS = 14.0
    CRUISE_MODE = "cruise"
    CHASE_MODE = "chase"

    def __init__(self, x: float, y: float, speed: float):
        """Initialize a predator.

        Args:
            x: Initial horizontal position.
            y: Initial vertical position.
            speed: Base cruise speed.
        """
        super().__init__(x, y)
        self.base_speed: float = speed
        self.cruise_heading: float = random.uniform(0.0, math.tau)
        self.cruise_steps_remaining: int = 0
        self.mode: str = self.CRUISE_MODE

    def base_metadata(self) -> dict:
        """Return metadata including the current foraging mode.

        Returns:
            Metadata dictionary used in serialized agent state.
        """
        return {"radius": self.radius, "mode": self.mode}

    def update(self, world) -> None:
        """Advance the predator by one tick.

        Args:
            world: Active simulation runtime.
        """
        if not self.alive:
            return
        cfg = world.config
        target = self._select_target(world, cfg)
        if target is not None:
            cx, cy, anchor = target
            self.mode = self.CHASE_MODE
            self.status = "chasing"
            self.target_id = anchor.id
            self.set_velocity_towards(
                cx, cy, self.base_speed * cfg.predator_chase_speed_factor
            )
        else:
            self.mode = self.CRUISE_MODE
            self.target_id = None
            self._cruise_step(cfg)
        self.move(cfg.width, cfg.height)

    def _select_target(self, world, cfg):
        """Pick a chase point with adaptive cluster detection.

        When a coherent cluster of size >= ``predator_cluster_min_size``
        is detected within sensor range, returns the cluster centroid
        so the predator dives into the school and triggers flash
        expansion (Major 1978, Parrish 1989).  Otherwise falls back to
        the nearest individual fish — appropriate during early ticks
        before schools have formed (Lima 2002 encounter model).

        Args:
            world: Active simulation runtime.
            cfg: Current simulation configuration.

        Returns:
            Tuple ``(target_x, target_y, anchor_fish)`` or ``None`` when
            no prey is in sensor range.
        """
        candidates = world.find_marine_life_near(
            self.x, self.y, cfg.predator_sensor_radius
        )
        if not candidates:
            return None

        link_radius = cfg.flock_zoa_radius
        best_cluster: list = []
        for fish in candidates:
            cluster = [fish]
            for other in candidates:
                if other is fish:
                    continue
                if math.hypot(other.x - fish.x, other.y - fish.y) <= link_radius:
                    cluster.append(other)
            if len(cluster) > len(best_cluster):
                best_cluster = cluster

        if len(best_cluster) >= cfg.predator_cluster_min_size:
            cx = sum(f.x for f in best_cluster) / len(best_cluster)
            cy = sum(f.y for f in best_cluster) / len(best_cluster)
            anchor = min(
                best_cluster, key=lambda f: (f.x - cx) ** 2 + (f.y - cy) ** 2
            )
            return (cx, cy, anchor)

        nearest = min(candidates, key=lambda f: self.distance_to(f))
        return (nearest.x, nearest.y, nearest)

    def _cruise_step(self, cfg) -> None:
        """Execute one tick of Lévy-style cruising.

        Heading is sampled once per leg; leg length follows the inverse-CDF
        Pareto draw matching Scout's ``_sample_levy_step``.  When the leg is
        exhausted, a new heading and length are sampled.

        Args:
            cfg: Current simulation configuration.
        """
        self.status = "cruising"
        if self.cruise_steps_remaining <= 0:
            self.cruise_heading = random.uniform(0.0, math.tau)
            self.cruise_steps_remaining = self._sample_levy_step(
                cfg.predator_levy_min_steps,
                cfg.predator_levy_max_steps,
                cfg.predator_levy_mu,
            )
        self._reflect_heading_at_bounds(cfg.width, cfg.height)
        self.vx = math.cos(self.cruise_heading) * self.base_speed
        self.vy = math.sin(self.cruise_heading) * self.base_speed
        self.cruise_steps_remaining -= 1

    def _reflect_heading_at_bounds(self, width: float, height: float) -> None:
        """Reflect the cruise heading off world edges to keep legs in-bounds.

        Args:
            width: World width.
            height: World height.
        """
        margin = 1.0
        if self.x <= margin and math.cos(self.cruise_heading) < 0:
            self.cruise_heading = math.pi - self.cruise_heading
        elif self.x >= width - margin and math.cos(self.cruise_heading) > 0:
            self.cruise_heading = math.pi - self.cruise_heading
        if self.y <= margin and math.sin(self.cruise_heading) < 0:
            self.cruise_heading = -self.cruise_heading
        elif self.y >= height - margin and math.sin(self.cruise_heading) > 0:
            self.cruise_heading = -self.cruise_heading

    @staticmethod
    def _sample_levy_step(min_step: int, max_step: int, mu: float) -> int:
        """Sample a Lévy-style step length bounded by [min_step, max_step].

        Inverse-CDF draw from a Pareto-like distribution ``P(L) ~ L^(-mu)``
        (Viswanathan et al. 1996), clipped to the configured bounds.

        Args:
            min_step: Minimum number of straight-line ticks per leg.
            max_step: Maximum number of straight-line ticks per leg.
            mu: Lévy exponent. Values near 2 give heavy-tailed legs.

        Returns:
            Sampled leg length, in ticks.
        """
        if max_step <= min_step:
            return max(min_step, 1)
        u = max(random.random(), 1e-6)
        exponent = 1.0 / (1.0 - mu) if mu != 1.0 else -1.0
        raw = min_step * (u ** exponent)
        return int(min(max(raw, min_step), max_step))
