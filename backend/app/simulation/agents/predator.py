from __future__ import annotations

import math
import random

from app.simulation.agents.base import BaseAgent


class Predator(BaseAgent):
    """Larger predatory fish that chases and eats smaller fish."""

    AGENT_TYPE = "predator"

    CHASE_RADIUS = 150.0
    EAT_RADIUS = 10.0

    def __init__(self, x: float, y: float, speed: float = 1.5):
        super().__init__(x, y)
        self.speed = speed
        self.energy = 150.0

    def update(self, agents: list[BaseAgent], width: float, height: float) -> None:
        if not self.alive:
            return

        nearby_fish = self.neighbours_by_type(agents, "fish", self.CHASE_RADIUS)
        nearest_fish = None
        nearest_dist = float("inf")
        for f in nearby_fish:
            d = self.distance_to(f)
            if d < nearest_dist:
                nearest_fish = f
                nearest_dist = d

        if nearest_fish is not None:
            target_angle = self.angle_to(nearest_fish)
            diff = (target_angle - self.angle + math.pi) % (2 * math.pi) - math.pi
            self.angle += diff * 0.08

            if nearest_dist < self.EAT_RADIUS:
                nearest_fish.alive = False
                self.energy = min(self.energy + 30, 200)
        else:
            self.angle += random.uniform(-0.2, 0.2)

        self.energy -= 0.1
        if self.energy <= 0:
            self.alive = False
            return

        self.x += math.cos(self.angle) * self.speed
        self.y += math.sin(self.angle) * self.speed
        self.wrap_position(width, height)
