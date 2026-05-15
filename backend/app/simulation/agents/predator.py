from __future__ import annotations

import math
import random

from app.simulation.agents.base import BaseAgent


class Predator(BaseAgent):
    """Lone predator that cruises with Lévy flights and chases nearby fish.

    Two-mode behaviour:
      - cruise: Lévy walk legs (Viswanathan et al. 1999) when no prey is in
        sensor range.
      - chase: targeted pursuit of the nearest marine_life within
        ``predator_sensor_radius`` at ``predator_chase_speed_factor`` × base.

    Wall avoidance uses the same gradient-repulsion approach as marine_life
    (Couzin 2002 boundary condition): a force scaling linearly from zero at
    ``predator_wall_repulsion_radius`` to its maximum at the wall is blended
    into the steering target in both modes, so the predator curves away
    smoothly instead of hard-reflecting at the edge.

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
        self.heading: float = random.uniform(0.0, math.tau)
        self.cruise_heading: float = self.heading
        self.cruise_steps_remaining: int = 0
        self.mode: str = self.CRUISE_MODE
        self._last_anchor_id: str | None = None
        self._last_anchor_panic: bool = False
        self._lunge_ticks_remaining: int = 0

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
            desired_angle = self._blend_wall_repulsion(
                math.atan2(cy - self.y, cx - self.x), cfg
            )
            self._advance_heading_toward(desired_angle, cfg.predator_max_turn_rate)

            # Trigger a brief lunge when the focal prey transitions into panic
            # (or when re-acquired already panicking). Acts as the predator's
            # startle response so the chase keeps tension during the fish
            # burst before the predator inevitably falls behind.
            anchor_panic_now = bool(getattr(anchor, "panic", False))
            anchor_changed = anchor.id != self._last_anchor_id
            panic_onset = anchor_panic_now and (
                anchor_changed or not self._last_anchor_panic
            )
            if panic_onset and self._lunge_ticks_remaining <= 0:
                self._lunge_ticks_remaining = cfg.predator_lunge_ticks
            self._last_anchor_id = anchor.id
            self._last_anchor_panic = anchor_panic_now

            chase_speed = self.base_speed * cfg.predator_chase_speed_factor
            if self._lunge_ticks_remaining > 0:
                progress = self._lunge_ticks_remaining / max(
                    cfg.predator_lunge_ticks, 1
                )
                lunge = 1.0 + (cfg.predator_lunge_factor - 1.0) * progress
                chase_speed *= lunge
                self._lunge_ticks_remaining -= 1
            elif self.distance_to(anchor) <= cfg.predator_preferred_distance:
                # Orbit reduction only when not lunging; lunge takes priority.
                chase_speed *= 0.7
            self.vx = math.cos(self.heading) * chase_speed
            self.vy = math.sin(self.heading) * chase_speed
        else:
            self.mode = self.CRUISE_MODE
            self.target_id = None
            self._last_anchor_id = None
            self._last_anchor_panic = False
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
            no prey is in sensor range.  The target point is offset by
            ``predator_preferred_distance`` so the predator never aims at
            the prey's exact centre.
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
            tx, ty = self._standoff_point(cx, cy, anchor, cfg)
            return (tx, ty, anchor)

        nearest = min(candidates, key=lambda f: self.distance_to(f))
        tx, ty = self._standoff_point(nearest.x, nearest.y, nearest, cfg)
        return (tx, ty, nearest)

    def _standoff_point(self, px: float, py: float, anchor, cfg) -> tuple[float, float]:
        """Return a chase point keeping ``predator_preferred_distance`` from prey.

        While the prey is beyond the standoff range, the predator aims
        ``preferred_distance`` short of it.  Once inside that range it aims
        ahead of the anchor's escape heading to intercept rather than collide.

        Args:
            px: Prey reference horizontal position (fish or cluster centroid).
            py: Prey reference vertical position.
            anchor: Anchor fish used for intercept aiming and its velocity.
            cfg: Current simulation configuration.

        Returns:
            Target point ``(x, y)`` for the predator to steer toward.
        """
        pref = cfg.predator_preferred_distance
        dist = math.hypot(px - self.x, py - self.y)
        if dist > pref:
            t = 1.0 - pref / dist
            return (self.x + (px - self.x) * t, self.y + (py - self.y) * t)
        escape_angle = (
            math.atan2(anchor.vy, anchor.vx)
            if (anchor.vx or anchor.vy)
            else 0.0
        )
        return (
            anchor.x + math.cos(escape_angle) * pref,
            anchor.y + math.sin(escape_angle) * pref,
        )

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
        # Bend the leg intent away from walls so that, once the deflection
        # frees the predator, it does not immediately steer back into the edge.
        self.cruise_heading = self._blend_wall_repulsion(self.cruise_heading, cfg)
        self._advance_heading_toward(self.cruise_heading, cfg.predator_max_turn_rate)
        self.vx = math.cos(self.heading) * self.base_speed
        self.vy = math.sin(self.heading) * self.base_speed
        self.cruise_steps_remaining -= 1

    def _advance_heading_toward(self, target: float, max_turn: float) -> None:
        diff = (target - self.heading + math.pi) % (2 * math.pi) - math.pi
        self.heading += max(-max_turn, min(max_turn, diff))

    def _wall_repulsion_force(self, cfg) -> tuple[float, float]:
        """Compute a steering force that pushes the predator away from walls.

        Force magnitude scales linearly with proximity: zero at
        ``predator_wall_repulsion_radius`` distance, maximum at the wall
        itself.  Mirrors the marine_life boundary handling so chase and
        cruise both curve away smoothly instead of hard-reflecting.

        Args:
            cfg: Current simulation configuration.

        Returns:
            Steering vector (dx, dy) directed away from nearby walls.
        """
        wr = cfg.predator_wall_repulsion_radius
        if wr <= 0.0:
            return (0.0, 0.0)
        dx, dy = 0.0, 0.0
        if self.x < wr:
            dx += (wr - self.x) / wr
        if self.x > cfg.width - wr:
            dx -= (self.x - (cfg.width - wr)) / wr
        if self.y < wr:
            dy += (wr - self.y) / wr
        if self.y > cfg.height - wr:
            dy -= (self.y - (cfg.height - wr)) / wr
        if dx == 0.0 and dy == 0.0:
            return (0.0, 0.0)
        weight = cfg.predator_wall_repulsion_weight
        return (dx * weight, dy * weight)

    def _blend_wall_repulsion(self, desired_angle: float, cfg) -> float:
        """Return a heading that adds the wall-repulsion vector to ``desired_angle``.

        The intent direction is treated as a unit vector and combined with
        the wall force; the result's angle is returned.  When no wall is
        nearby, ``desired_angle`` is returned unchanged.

        Args:
            desired_angle: Intended steering angle in radians.
            cfg: Current simulation configuration.

        Returns:
            Possibly deflected heading in radians.
        """
        wx, wy = self._wall_repulsion_force(cfg)
        if wx == 0.0 and wy == 0.0:
            return desired_angle
        bx = math.cos(desired_angle) + wx
        by = math.sin(desired_angle) + wy
        if bx == 0.0 and by == 0.0:
            return desired_angle
        return math.atan2(by, bx)

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
