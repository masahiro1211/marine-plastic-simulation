from __future__ import annotations

import math
import random

from app.simulation.agents.base import BaseAgent


class Plastic(BaseAgent):
    """Marine plastic debris that drifts with simulated ocean current."""

    AGENT_TYPE = "plastic"

    def __init__(self, x: float, y: float, drift_speed: float = 0.3):
        super().__init__(x, y)
        self.drift_speed = drift_speed
        self.energy = 999.0

    def update(self, agents: list[BaseAgent], width: float, height: float) -> None:
        if not self.alive:
            return
        self.x += math.cos(self.angle) * self.drift_speed
        self.y += math.sin(self.angle) * self.drift_speed * 0.5
        self.angle += random.uniform(-0.05, 0.05)
        self.wrap_position(width, height)
