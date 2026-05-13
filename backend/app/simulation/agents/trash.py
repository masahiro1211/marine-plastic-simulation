from __future__ import annotations

import random

from app.simulation.agents.base import BaseAgent


class Trash(BaseAgent):
    """Drifting trash actor that can be detected and collected."""
    AGENT_TYPE = "trash"
    ROLE = "trash"
    DEFAULT_RADIUS = 7.0

    def __init__(
        self,
        x: float,
        y: float,
        drift_speed: float,
        source_id: str = "legacy",
        source_x: float | None = None,
        source_y: float | None = None,
    ):
        """Initialize a trash actor.

        Args:
            x: Initial horizontal position.
            y: Initial vertical position.
            drift_speed: Maximum drift speed.
            source_id: Trash source preset identifier.
            source_x: Horizontal source position for outflow transport.
            source_y: Vertical source position for outflow transport.
        """
        super().__init__(x, y)
        self.drift_speed = drift_speed
        self.energy = 0.0
        self.source_id = source_id
        self.source_x = source_x if source_x is not None else x
        self.source_y = source_y if source_y is not None else y

    def update(self, world) -> None:
        """Advance the trash actor by one tick.

        Args:
            world: Active simulation runtime.
        """
        if not self.alive:
            return
        self.status = "drifting"
        current_x, current_y = world.trash_current_vector()
        outflow_x, outflow_y = world.trash_source_outflow(self)
        convergence_x, convergence_y = world.trash_convergence_pull(self)
        self.vx += current_x + outflow_x + convergence_x
        self.vy += current_y + outflow_y + convergence_y
        self.add_random_motion(world.config.diffusion_strength)
        self.clamp_speed(self.drift_speed)
        self.move(world.config.width, world.config.height)
        self.y = min(self.y, world.config.height - 64)
        self.vx += random.uniform(
            -world.config.diffusion_strength,
            world.config.diffusion_strength,
        )
        self.vy += random.uniform(
            -world.config.diffusion_strength,
            world.config.diffusion_strength,
        )

    def base_metadata(self) -> dict:
        """Return trash metadata for source-aware rendering or debugging."""
        metadata = super().base_metadata()
        metadata["source_id"] = self.source_id
        return metadata
