from __future__ import annotations

import random

from app.simulation.agents.base import BaseAgent


class Trash(BaseAgent):
    AGENT_TYPE = "trash"
    ROLE = "trash"
    DEFAULT_RADIUS = 7.0

    def __init__(self, x: float, y: float, drift_speed: float):
        super().__init__(x, y)
        self.drift_speed = drift_speed
        self.energy = 0.0

    def update(self, world) -> None:
        if not self.alive:
            return
        self.status = "drifting"
        self.add_random_motion(0.08)
        self.clamp_speed(self.drift_speed)
        self.move(world.config.width, world.config.height)
        self.y = min(self.y, world.config.height - 64)
        self.vx += random.uniform(-0.02, 0.02)
        self.vy += random.uniform(-0.02, 0.02)
