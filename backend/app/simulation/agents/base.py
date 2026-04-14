from __future__ import annotations

import math
import random
from abc import ABC, abstractmethod
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from app.models.schemas import AgentState
    from app.simulation.engine import SimulationEngine


class BaseAgent(ABC):
    """Base class shared by all simulation actors.

    Attributes:
        id: Unique identifier for the actor instance.
        x: Horizontal position.
        y: Vertical position.
        vx: Horizontal velocity.
        vy: Vertical velocity.
        radius: Interaction radius.
        energy: Current energy amount.
        alive: Whether the actor is active in the world.
        status: Current behavior label.
        target_id: Identifier of the current target, if any.
    """

    AGENT_TYPE = "base"
    ROLE = "base"
    DEFAULT_RADIUS = 8.0
    _id_counter = 0

    def __init__(self, x: float, y: float, radius: float | None = None):
        """Initialize a simulation actor.

        Args:
            x: Initial horizontal position.
            y: Initial vertical position.
            radius: Optional explicit radius override.
        """
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
        """Return the Euclidean distance to another agent.

        Args:
            other: Target agent.

        Returns:
            Distance between the two agents.
        """
        return math.hypot(self.x - other.x, self.y - other.y)

    def distance_to_point(self, x: float, y: float) -> float:
        """Return the Euclidean distance to a point.

        Args:
            x: Target horizontal position.
            y: Target vertical position.

        Returns:
            Distance to the target point.
        """
        return math.hypot(self.x - x, self.y - y)

    def set_velocity_towards(self, tx: float, ty: float, speed: float) -> None:
        """Set velocity toward a target point using the given speed.

        Args:
            tx: Target horizontal position.
            ty: Target vertical position.
            speed: Desired movement speed.
        """
        dx = tx - self.x
        dy = ty - self.y
        norm = math.hypot(dx, dy) or 1.0
        self.vx = dx / norm * speed
        self.vy = dy / norm * speed

    def set_velocity_away_from(self, tx: float, ty: float, speed: float) -> None:
        """Set velocity away from a target point using the given speed.

        Args:
            tx: Source horizontal position to flee from.
            ty: Source vertical position to flee from.
            speed: Desired movement speed.
        """
        dx = self.x - tx
        dy = self.y - ty
        norm = math.hypot(dx, dy) or 1.0
        self.vx = dx / norm * speed
        self.vy = dy / norm * speed

    def add_random_motion(self, magnitude: float) -> None:
        """Perturb the current velocity by a bounded random amount.

        Args:
            magnitude: Maximum absolute delta per axis.
        """
        self.vx += random.uniform(-magnitude, magnitude)
        self.vy += random.uniform(-magnitude, magnitude)

    def clamp_speed(self, max_speed: float) -> None:
        """Clamp the current velocity magnitude.

        Args:
            max_speed: Maximum allowed speed.
        """
        speed = math.hypot(self.vx, self.vy)
        if speed > max_speed and speed > 0:
            scale = max_speed / speed
            self.vx *= scale
            self.vy *= scale

    def move(self, width: float, height: float) -> None:
        """Advance the actor and keep it inside world bounds.

        Args:
            width: World width.
            height: World height.
        """
        self.x = min(max(self.x + self.vx, 0), width)
        self.y = min(max(self.y + self.vy, 0), height)

    def base_metadata(self) -> dict:
        """Return metadata shared by all actor types.

        Returns:
            Metadata dictionary used in serialized agent state.
        """
        return {"radius": self.radius}

    def to_state(self) -> AgentState:
        """Serialize the actor into an API-facing state object.

        Returns:
            Serialized agent state.
        """
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
        """Advance the actor by one tick.

        Args:
            world: Active simulation runtime.
        """
        ...

    @classmethod
    def reset_id_counter(cls) -> None:
        """Reset the shared identifier counter for deterministic IDs."""
        cls._id_counter = 0
