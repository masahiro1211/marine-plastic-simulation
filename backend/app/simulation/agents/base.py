from __future__ import annotations

import math
import random
from abc import ABC, abstractmethod


class BaseAgent(ABC):
    """Abstract base class for all simulation agents.

    All agents must inherit from this class and implement the `update()` method.
    """

    AGENT_TYPE: str = "base"

    _id_counter: int = 0

    def __init__(self, x: float, y: float):
        BaseAgent._id_counter += 1
        self.id: int = BaseAgent._id_counter
        self.x: float = x
        self.y: float = y
        self.angle: float = random.uniform(0, 2 * math.pi)
        self.energy: float = 100.0
        self.alive: bool = True

    def distance_to(self, other: BaseAgent) -> float:
        return math.hypot(self.x - other.x, self.y - other.y)

    def angle_to(self, other: BaseAgent) -> float:
        return math.atan2(other.y - self.y, other.x - self.x)

    def wrap_position(self, width: float, height: float) -> None:
        self.x = self.x % width
        self.y = self.y % height

    def neighbours_by_type(
        self,
        agents: list[BaseAgent],
        agent_type: str,
        radius: float,
    ) -> list[BaseAgent]:
        return [
            a
            for a in agents
            if a is not self
            and a.alive
            and a.AGENT_TYPE == agent_type
            and self.distance_to(a) < radius
        ]

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "agent_type": self.AGENT_TYPE,
            "x": self.x,
            "y": self.y,
            "angle": self.angle,
            "energy": self.energy,
            "alive": self.alive,
        }

    @abstractmethod
    def update(self, agents: list[BaseAgent], width: float, height: float) -> None:
        ...

    @classmethod
    def reset_id_counter(cls) -> None:
        cls._id_counter = 0
