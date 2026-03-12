from __future__ import annotations

import random

from app.models.schemas import SimulationConfig
from app.simulation.agents import Agent, Fish, Plastic, Predator


class SimulationEngine:
    """Manages the multi-agent ocean simulation."""

    def __init__(self, config: SimulationConfig | None = None):
        self.config = config or SimulationConfig()
        self.agents: list[Agent] = []
        self.tick = 0
        self.running = False
        self._init_agents()

    def _init_agents(self):
        Agent._id_counter = 0
        self.agents.clear()
        w, h = self.config.width, self.config.height

        for _ in range(self.config.num_fish):
            self.agents.append(
                Fish(
                    random.uniform(0, w),
                    random.uniform(0, h),
                    self.config.fish_speed,
                )
            )

        for _ in range(self.config.num_predators):
            self.agents.append(
                Predator(
                    random.uniform(0, w),
                    random.uniform(0, h),
                    self.config.predator_speed,
                )
            )

        for _ in range(self.config.num_plastics):
            self.agents.append(
                Plastic(
                    random.uniform(0, w),
                    random.uniform(0, h),
                    self.config.plastic_drift_speed,
                )
            )

    def step(self):
        """Advance the simulation by one tick."""
        self.tick += 1
        for agent in self.agents:
            agent.update(self.agents, self.config.width, self.config.height)

    def get_snapshot(self) -> dict:
        """Return the current state of all agents."""
        alive_fish = sum(
            1 for a in self.agents if a.agent_type == "fish" and a.alive
        )
        alive_predators = sum(
            1 for a in self.agents if a.agent_type == "predator" and a.alive
        )
        alive_plastics = sum(
            1 for a in self.agents if a.agent_type == "plastic" and a.alive
        )

        return {
            "tick": self.tick,
            "agents": [a.to_dict() for a in self.agents if a.alive],
            "stats": {
                "fish": alive_fish,
                "predators": alive_predators,
                "plastics": alive_plastics,
                "total": alive_fish + alive_predators + alive_plastics,
            },
        }

    def reset(self, config: SimulationConfig | None = None):
        """Reset the simulation with optional new config."""
        if config:
            self.config = config
        self.tick = 0
        self._init_agents()
