from __future__ import annotations

import math
import random

from app.simulation.agents.base import BaseAgent


class Fish(BaseAgent):
    """Small fish using Boids-like flocking behaviour."""

    AGENT_TYPE = "fish"

    PERCEPTION_RADIUS = 60.0
    SEPARATION_RADIUS = 20.0
    PREDATOR_FLEE_RADIUS = 100.0
    PLASTIC_DAMAGE_RADIUS = 15.0

    def __init__(self, x: float, y: float, speed: float = 2.0):
        super().__init__(x, y)
        self.speed = speed

    def update(self, agents: list[BaseAgent], width: float, height: float) -> None:
        if not self.alive:
            return

        neighbours = self.neighbours_by_type(agents, "fish", self.PERCEPTION_RADIUS)
        predators = self.neighbours_by_type(agents, "predator", self.PREDATOR_FLEE_RADIUS)
        plastics = self.neighbours_by_type(agents, "plastic", self.PLASTIC_DAMAGE_RADIUS)

        dx, dy = 0.0, 0.0

        # Separation
        for n in neighbours:
            if self.distance_to(n) < self.SEPARATION_RADIUS:
                dx -= n.x - self.x
                dy -= n.y - self.y

        # Alignment
        if neighbours:
            avg_angle = math.atan2(
                sum(math.sin(n.angle) for n in neighbours),
                sum(math.cos(n.angle) for n in neighbours),
            )
            dx += math.cos(avg_angle) * 0.5
            dy += math.sin(avg_angle) * 0.5

        # Cohesion
        if neighbours:
            cx = sum(n.x for n in neighbours) / len(neighbours)
            cy = sum(n.y for n in neighbours) / len(neighbours)
            dx += (cx - self.x) * 0.01
            dy += (cy - self.y) * 0.01

        # Flee from predators
        for p in predators:
            dist = max(self.distance_to(p), 1.0)
            dx -= (p.x - self.x) * 3.0 / dist
            dy -= (p.y - self.y) * 3.0 / dist

        # Plastic damage
        self.energy -= 0.5 * len(plastics)
        if self.energy <= 0:
            self.alive = False
            return

        # Steering
        if dx != 0 or dy != 0:
            target_angle = math.atan2(dy, dx)
            diff = (target_angle - self.angle + math.pi) % (2 * math.pi) - math.pi
            self.angle += diff * 0.1
        else:
            self.angle += random.uniform(-0.3, 0.3)

        self.x += math.cos(self.angle) * self.speed
        self.y += math.sin(self.angle) * self.speed
        self.wrap_position(width, height)
