from __future__ import annotations

import unittest

from app.models.schemas import SimulationConfig
from app.simulation.engine import SimulationEngine
from app.simulation.agents import Collector, Trash


class SimulationEngineTests(unittest.TestCase):
    def test_snapshot_uses_new_contract(self) -> None:
        engine = SimulationEngine(
            SimulationConfig(
                scout_count=1,
                collector_count=1,
                marine_life_count=1,
                initial_trash_count=1,
                steps=10,
            )
        )

        snapshot = engine.get_snapshot()

        self.assertEqual(snapshot["phase"], "idle")
        self.assertIn("base", snapshot)
        self.assertIn("score", snapshot)
        self.assertIn("events", snapshot)
        self.assertEqual(snapshot["stats"]["scouts"], 1)
        self.assertEqual(snapshot["stats"]["collectors"], 1)

    def test_collector_can_pick_and_deliver_trash_at_base(self) -> None:
        engine = SimulationEngine(
            SimulationConfig(
                scout_count=0,
                collector_count=1,
                marine_life_count=0,
                initial_trash_count=1,
                steps=10,
            )
        )
        collector = next(agent for agent in engine.agents if isinstance(agent, Collector))
        trash = next(agent for agent in engine.agents if isinstance(agent, Trash))

        collector.x = engine.base.x
        collector.y = engine.base.y - 32
        trash.x = engine.base.x
        trash.y = engine.base.y - 32

        engine.start()
        engine.step()

        self.assertEqual(engine.delivered_trash, 1)
        self.assertEqual(engine.get_snapshot()["stats"]["delivered_trash"], 1)


if __name__ == "__main__":
    unittest.main()
