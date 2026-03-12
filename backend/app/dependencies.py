from app.simulation.engine import SimulationEngine

_engine = SimulationEngine()


def get_engine() -> SimulationEngine:
    return _engine
