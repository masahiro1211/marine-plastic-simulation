from __future__ import annotations

import math
import random

from app.simulation.agents.base import BaseAgent


class Scout(BaseAgent):
    """Scout robot using Albatross-inspired adaptive foraging.

    The scout alternates between two foraging modes inspired by the
    adaptive food search of wandering albatrosses (see Viswanathan et
    al., 1996):

    - ``scan`` (a): long, near-straight-line legs sampled from a
      Lévy-style step distribution to cover wide areas quickly.
    - ``search`` (b): small-scale random walk that densely sweeps the
      neighbourhood once a target patch has been found.

    Switching is adaptive:

    - ``scan`` → ``search`` immediately when at least one trash item
      is detected within the sensor radius.
    - ``search`` → ``scan`` after ``scout_search_duration`` consecutive
      ticks without any new detection.
    """

    AGENT_TYPE = "scout"
    ROLE = "scout"
    DEFAULT_RADIUS = 9.0

    SCAN_MODE = "scan"
    SEARCH_MODE = "search"

    def __init__(
        self,
        x: float,
        y: float,
        speed: float,
        sensor_radius: float,
        max_energy: float,
    ):
        """Initialize a scout robot.

        Args:
            x: Initial horizontal position.
            y: Initial vertical position.
            speed: Movement speed used during scan and search.
            sensor_radius: Detection radius for nearby trash.
            max_energy: Initial and maximum robot energy.
        """
        super().__init__(x, y)
        self.speed = speed
        self.sensor_radius = sensor_radius
        self.energy = max_energy

        self.mode: str = self.SCAN_MODE
        self.scan_heading: float = random.uniform(0.0, math.tau)
        self.scan_steps_remaining: int = 0
        self.search_ticks_without_find: int = 0

    def base_metadata(self) -> dict:
        """Return scout-specific metadata for serialization.

        Returns:
            Metadata including the sensor radius and the current
            foraging mode label so clients can render the strategy.
        """
        data = super().base_metadata()
        data.update(
            {
                "sensor_radius": self.sensor_radius,
                "foraging_mode": self.mode,
            }
        )
        return data

    def update(self, world) -> None:
        """Advance the scout by one tick.

        Args:
            world: Active simulation runtime.
        """
        if not self.alive:
            return

        config = world.config
        nearby_trash = world.find_trash_near(self.x, self.y, self.sensor_radius)
        for trash in nearby_trash:
            world.share_target(trash, self)

        battery_enabled = getattr(config, "scout_battery_enabled", False)
        needs_return = battery_enabled and world.should_return_to_base(self)

        if needs_return:
            self.status = "returning"
            speed = self.speed * (
                config.return_speed_factor if self.energy <= 0 else 1.0
            )
            self.set_velocity_towards(world.base.x, world.base.y, speed)
        else:
            self._update_foraging(nearby_trash, config)

        world.apply_robot_avoidance(self)
        world.apply_marine_life_avoidance(self)
        self._reflect_heading_at_bounds(config.width, config.height)
        self.move(config.width, config.height)

        if battery_enabled:
            world.drain_energy(self)

    def _update_foraging(self, nearby_trash, config) -> None:
        """Advance the foraging state machine for one tick.

        Args:
            nearby_trash: Trash items detected this tick.
            config: Active simulation configuration.
        """
        if nearby_trash:
            self.mode = self.SEARCH_MODE
            self.search_ticks_without_find = 0
        elif self.mode == self.SEARCH_MODE:
            self.search_ticks_without_find += 1
            if self.search_ticks_without_find >= config.scout_search_duration:
                self.mode = self.SCAN_MODE
                self.scan_steps_remaining = 0

        if self.mode == self.SCAN_MODE:
            self._scan_step(config)
        else:
            self._search_step(config)

    def _scan_step(self, config) -> None:
        """Execute one tick of (a) long-range straight-line scanning."""
        self.status = "scanning"
        if self.scan_steps_remaining <= 0:
            self.scan_heading = random.uniform(0.0, math.tau)
            self.scan_steps_remaining = self._sample_levy_step(
                config.scout_levy_min_steps,
                config.scout_levy_max_steps,
                config.scout_levy_mu,
            )
        self.vx = math.cos(self.scan_heading) * self.speed
        self.vy = math.sin(self.scan_heading) * self.speed
        self.scan_steps_remaining -= 1

    def _search_step(self, config) -> None:
        """Execute one tick of (b) small-scale detailed search."""
        self.status = "searching"
        self.add_random_motion(config.random_weight * 2.0)
        self.clamp_speed(self.speed * 0.6)

    def _reflect_heading_at_bounds(self, width: float, height: float) -> None:
        """Bounce the scan heading off world edges to keep legs in-bounds."""
        margin = 1.0
        if self.x <= margin and math.cos(self.scan_heading) < 0:
            self.scan_heading = math.pi - self.scan_heading
        elif self.x >= width - margin and math.cos(self.scan_heading) > 0:
            self.scan_heading = math.pi - self.scan_heading
        if self.y <= margin and math.sin(self.scan_heading) < 0:
            self.scan_heading = -self.scan_heading
        elif self.y >= height - margin and math.sin(self.scan_heading) > 0:
            self.scan_heading = -self.scan_heading

    @staticmethod
    def _sample_levy_step(min_step: int, max_step: int, mu: float) -> int:
        """Sample a Lévy-style step length bounded by [min_step, max_step].

        Uses an inverse-CDF draw from a Pareto-like distribution
        ``P(L) ~ L^(-mu)`` (Viswanathan et al., 1996), then clips to
        the configured bounds so a single leg never exceeds the world.

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
        exponent = -1.0 / max(mu - 1.0, 1e-6)
        raw = min_step * (u ** exponent)
        return int(min(max(raw, min_step), max_step))
