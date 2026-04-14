from __future__ import annotations

from app.simulation.agents.base import BaseAgent


class MarineLife(BaseAgent):
    """Marine life actor that evades robots and accumulates stress."""
    AGENT_TYPE = "marine_life"
    ROLE = "marine_life"
    DEFAULT_RADIUS = 10.0

    def __init__(self, x: float, y: float, speed: float):
        """Initialize a marine life actor.

        Args:
            x: Initial horizontal position.
            y: Initial vertical position.
            speed: Movement speed.
        """
        super().__init__(x, y)
        self.speed = speed
        self.energy = 1.0
        self.stress = 0.0

    def base_metadata(self) -> dict:
        """Return marine-life-specific metadata for serialization.

        Returns:
            Metadata including the current stress value.
        """
        data = super().base_metadata()
        data.update({"stress": round(self.stress, 2)})
        return data

    def update(self, world) -> None:
        """Advance the marine life actor by one tick.

        Args:
            world: Active simulation runtime.
        """
        if not self.alive:
            return

        nearby_robots = world.find_robots_near(self.x, self.y, world.config.marine_life_avoid_radius)
        if nearby_robots:
            nearest = min(nearby_robots, key=self.distance_to)
            self.status = "evading"
            self.set_velocity_away_from(nearest.x, nearest.y, self.speed)
            self.stress += world.config.stress_gain_per_robot * len(nearby_robots)
        else:
            self.status = "swimming"
            self.add_random_motion(0.22)
            self.clamp_speed(self.speed)
            self.stress = max(0.0, self.stress - world.config.stress_decay_per_tick)

        self.move(world.config.width, world.config.height)

        if self.stress >= world.config.stress_threshold:
            world.mark_marine_life_lost(self)
