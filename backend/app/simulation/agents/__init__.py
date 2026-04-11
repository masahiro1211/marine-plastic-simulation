"""Simulation agent exports."""

from app.simulation.agents.base import BaseAgent
from app.simulation.agents.collector import Collector
from app.simulation.agents.marine_life import MarineLife
from app.simulation.agents.scout import Scout
from app.simulation.agents.trash import Trash

__all__ = ["BaseAgent", "Collector", "MarineLife", "Scout", "Trash"]
