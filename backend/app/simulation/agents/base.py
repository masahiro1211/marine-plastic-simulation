from __future__ import annotations

import math
import random
from abc import ABC, abstractmethod
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from app.models.schemas import AgentState
    from app.simulation.engine import SimulationEngine


class BaseAgent(ABC):
    """Shared state and helpers for all simulation actors."""

    AGENT_TYPE = "base"
    ROLE = "base"
    DEFAULT_RADIUS = 8.0
    _id_counter = 0

    def __init__(self, x: float, y: float, radius: float | None = None):
        BaseAgent._id_counter += 1
        self.id = f"{self.ROLE}-{BaseAgent._id_counter}"
        self.x = x
        self.y = y
        self.vx = random.uniform(-0.3, 0.3)
        self.vy = random.uniform(-0.3, 0.3)
        self.radius = radius or self.DEFAULT_RADIUS
        self.energy = 0.0
        self.alive = True
        self.status = "idle"
        self.target_id: str | None = None

    def distance_to(self, other: BaseAgent) -> float:
        return math.hypot(self.x - other.x, self.y - other.y)

    def distance_to_point(self, x: float, y: float) -> float:
        return math.hypot(self.x - x, self.y - y)

    def set_velocity_towards(self, tx: float, ty: float, speed: float) -> None:
        dx = tx - self.x
        dy = ty - self.y
        norm = math.hypot(dx, dy) or 1.0
        self.vx = dx / norm * speed
        self.vy = dy / norm * speed

    def set_velocity_away_from(self, tx: float, ty: float, speed: float) -> None:
        dx = self.x - tx
        dy = self.y - ty
        norm = math.hypot(dx, dy) or 1.0
        self.vx = dx / norm * speed
        self.vy = dy / norm * speed

    def add_random_motion(self, magnitude: float) -> None:
        self.vx += random.uniform(-magnitude, magnitude)
        self.vy += random.uniform(-magnitude, magnitude)

    def clamp_speed(self, max_speed: float) -> None:
        speed = math.hypot(self.vx, self.vy)
        if speed > max_speed and speed > 0:
            scale = max_speed / speed
            self.vx *= scale
            self.vy *= scale

    def move(self, width: float, height: float) -> None:
        self.x = min(max(self.x + self.vx, 0), width)
        self.y = min(max(self.y + self.vy, 0), height)

    def base_metadata(self) -> dict:
        return {"radius": self.radius}

    def to_state(self) -> AgentState:
        from app.models.schemas import AgentState

        return AgentState(
            id=self.id,
            agent_type=self.AGENT_TYPE,
            role=self.ROLE,
            x=self.x,
            y=self.y,
            vx=self.vx,
            vy=self.vy,
            alive=self.alive,
            status=self.status,
            energy=self.energy,
            target_id=self.target_id,
            metadata=self.base_metadata(),
        )

    @abstractmethod
    def update(self, world: SimulationEngine) -> None:
        ...

    @classmethod
    def reset_id_counter(cls) -> None:
        cls._id_counter = 0
