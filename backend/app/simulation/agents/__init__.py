"""Re-export all agent classes for convenience."""

from app.simulation.agents.base import BaseAgent
from app.simulation.agents.fish import Fish
from app.simulation.agents.plastic import Plastic
from app.simulation.agents.predator import Predator

__all__ = ["BaseAgent", "Fish", "Plastic", "Predator"]
