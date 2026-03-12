from __future__ import annotations

import random
from collections import deque

from app.models.schemas import SimulationConfig, StatsEntry
from app.simulation.agents import BaseAgent, Fish, Plastic, Predator


MAX_HISTORY = 500  # keep last N ticks of stats


class SimulationEngine:
    """Manages the multi-agent ocean simulation."""

    def __init__(self, config: SimulationConfig | None = None):
        self.config = config or SimulationConfig()
        self.agents: list[BaseAgent] = []
        self.tick: int = 0
        self.running: bool = False
        self.stats_history: deque[StatsEntry] = deque(maxlen=MAX_HISTORY)
        self._init_agents()

    # ------------------------------------------------------------------
    # Agent initialisation
    # ------------------------------------------------------------------

    def _init_agents(self) -> None:
        BaseAgent.reset_id_counter()
        self.agents.clear()
        w, h = self.config.width, self.config.height

        for _ in range(self.config.num_fish):
            self.agents.append(
                Fish(random.uniform(0, w), random.uniform(0, h), self.config.fish_speed)
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

    # ------------------------------------------------------------------
    # Simulation control
    # ------------------------------------------------------------------

    def step(self) -> None:
        """Advance the simulation by one tick."""
        self.tick += 1
        for agent in self.agents:
            agent.update(self.agents, self.config.width, self.config.height)

        entry = self._current_stats()
        self.stats_history.append(entry)

    def reset(self, config: SimulationConfig | None = None) -> None:
        """Reset the simulation with optional new config."""
        if config:
            self.config = config
        self.tick = 0
        self.stats_history.clear()
        self._init_agents()

    # ------------------------------------------------------------------
    # Queries
    # ------------------------------------------------------------------

    def _current_stats(self) -> StatsEntry:
        fish = sum(1 for a in self.agents if a.AGENT_TYPE == "fish" and a.alive)
        predators = sum(1 for a in self.agents if a.AGENT_TYPE == "predator" and a.alive)
        plastics = sum(1 for a in self.agents if a.AGENT_TYPE == "plastic" and a.alive)
        return StatsEntry(
            tick=self.tick,
            fish=fish,
            predators=predators,
            plastics=plastics,
            total=fish + predators + plastics,
        )

    def get_snapshot(self) -> dict:
        """Return the current state of all agents."""
        stats = self._current_stats()
        return {
            "tick": self.tick,
            "agents": [a.to_dict() for a in self.agents if a.alive],
            "stats": stats.model_dump(),
        }

    def get_stats_history(self) -> list[dict]:
        """Return recorded stats for graphing."""
        return [entry.model_dump() for entry in self.stats_history]
