from __future__ import annotations

import math
import random

from app.simulation.agents.base import BaseAgent


class MarineLife(BaseAgent):
    """Marine life actor that schools via Couzin zonal rules and flees robots.

    Heading is updated each tick by the highest-priority steering source:
    robot avoidance first, then the Couzin zone of repulsion, otherwise a
    blend of zone-of-orientation alignment and zone-of-attraction cohesion.
    """

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
        self.heading = math.atan2(self.vy, self.vx) if (self.vx or self.vy) else random.uniform(-math.pi, math.pi)
        self._robots_inside: set[str] = set()
        self.contact_count = 0
        self.ate_trash_count = 0

    def update(self, world) -> None:
        """Advance the marine life actor by one tick.

        Args:
            world: Active simulation runtime.
        """
        if not self.alive:
            return

        cfg = world.config

        nearby_robots = world.find_robots_near(self.x, self.y, cfg.marine_life_avoid_radius)
        current_ids = {robot.id for robot in nearby_robots}
        newly_entered = current_ids - self._robots_inside
        if newly_entered:
            count = len(newly_entered)
            self.contact_count += count
            world.robot_fish_contacts += count
        self._robots_inside = current_ids

        if nearby_robots:
            nearest = min(nearby_robots, key=self.distance_to)
            self.status = "evading"
            desired: tuple[float, float] | None = (self.x - nearest.x, self.y - nearest.y)
        else:
            desired = self._flock_steering(world, cfg)

        self._advance_heading(desired, cfg)

        self.vx = math.cos(self.heading) * self.speed
        self.vy = math.sin(self.heading) * self.speed
        self.move(cfg.width, cfg.height)

        self._eat_nearby_trash(world, cfg)

    def _eat_nearby_trash(self, world, cfg) -> None:
        """Ingest one nearby trash item if any is within reach.

        Args:
            world: Active simulation runtime.
            cfg: Current simulation configuration.
        """
        nearby = world.find_trash_near(self.x, self.y, cfg.fish_eat_radius)
        if not nearby:
            return
        world.fish_eats_trash(self, nearby[0])

    def _flock_steering(self, world, cfg) -> tuple[float, float] | None:
        """Compute the Couzin zonal steering vector from nearby kin.

        Args:
            world: Active simulation runtime.
            cfg: Current simulation configuration.

        Returns:
            Desired steering vector, or None if no neighbours influence heading.
        """
        search_radius = max(cfg.flock_zor_radius, cfg.flock_zoo_radius, cfg.flock_zoa_radius)
        neighbours = [
            life
            for life in world.find_marine_life_near(self.x, self.y, search_radius)
            if life is not self
        ]

        if not neighbours:
            self.status = "swimming"
            return None

        zor: list[MarineLife] = []
        zoo: list[MarineLife] = []
        zoa: list[MarineLife] = []
        for other in neighbours:
            distance = self.distance_to(other)
            if distance < cfg.flock_zor_radius:
                zor.append(other)
            elif distance < cfg.flock_zoo_radius:
                zoo.append(other)
            elif distance <= cfg.flock_zoa_radius:
                zoa.append(other)

        if zor:
            self.status = "spacing"
            dx = sum(self.x - other.x for other in zor)
            dy = sum(self.y - other.y for other in zor)
            return (dx, dy)

        dx = 0.0
        dy = 0.0
        if zoo:
            sin_sum = sum(math.sin(other.heading) for other in zoo)
            cos_sum = sum(math.cos(other.heading) for other in zoo)
            dx += cos_sum * cfg.flock_alignment_weight
            dy += sin_sum * cfg.flock_alignment_weight
        if zoa:
            cx = sum(other.x for other in zoa) / len(zoa)
            cy = sum(other.y for other in zoa) / len(zoa)
            vx = cx - self.x
            vy = cy - self.y
            norm = math.hypot(vx, vy) or 1.0
            dx += vx / norm * cfg.flock_cohesion_weight
            dy += vy / norm * cfg.flock_cohesion_weight

        if dx == 0.0 and dy == 0.0:
            self.status = "swimming"
            return None

        self.status = "schooling"
        return (dx, dy)

    def _advance_heading(self, desired: tuple[float, float] | None, cfg) -> None:
        """Rotate the current heading toward the desired direction with limits.

        Args:
            desired: Target steering vector, or None to keep current heading.
            cfg: Current simulation configuration.
        """
        if desired is not None and (desired[0] != 0.0 or desired[1] != 0.0):
            target = math.atan2(desired[1], desired[0])
            diff = (target - self.heading + math.pi) % (2 * math.pi) - math.pi
            max_turn = cfg.flock_max_turn_rate
            if diff > max_turn:
                diff = max_turn
            elif diff < -max_turn:
                diff = -max_turn
            self.heading += diff
        self.heading += random.uniform(-cfg.flock_noise, cfg.flock_noise)
