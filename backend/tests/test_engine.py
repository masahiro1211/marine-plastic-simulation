from __future__ import annotations

import unittest
import random

from app.models.schemas import SimulationConfig
from app.simulation.engine import SimulationEngine
from app.simulation.agents import Collector, MarineLife, Scout, Trash


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

    def test_marine_life_can_be_lost_and_respawn(self) -> None:
        engine = SimulationEngine(
            SimulationConfig(
                scout_count=1,
                collector_count=0,
                marine_life_count=1,
                initial_trash_count=0,
                stress_threshold=0.2,
                marine_life_respawn_delay=1,
                steps=10,
            )
        )
        scout = next(agent for agent in engine.agents if isinstance(agent, Scout))
        marine_life = next(agent for agent in engine.agents if isinstance(agent, MarineLife))

        scout.x = 100
        scout.y = 100
        marine_life.x = 100
        marine_life.y = 100

        engine.start()
        engine.step()
        self.assertFalse(marine_life.alive)

        engine.step()
        self.assertGreaterEqual(len(engine.marine_life), 1)

    def test_runtime_trash_cluster_respects_max_trash(self) -> None:
        random.seed(10)
        engine = SimulationEngine(
            SimulationConfig(
                scout_count=0,
                collector_count=0,
                marine_life_count=0,
                initial_trash_count=0,
                trash_spawn_interval=1,
                max_trash=2,
                trash_cluster_min=5,
                trash_cluster_max=5,
                trash_source_profile="storm",
                steps=10,
            )
        )

        engine.step()

        self.assertEqual(len(engine.trash_items), 2)
        self.assertLessEqual(len(engine.trash_items), engine.config.max_trash)

    def test_source_profile_adds_source_metadata(self) -> None:
        random.seed(11)
        engine = SimulationEngine(
            SimulationConfig(
                scout_count=0,
                collector_count=0,
                marine_life_count=0,
                initial_trash_count=6,
                trash_source_profile="harbor",
            )
        )

        source_ids = {trash.source_id for trash in engine.trash_items}

        self.assertNotEqual(source_ids, {"legacy"})
        self.assertTrue(source_ids <= {"river_mouth", "coastal_city", "harbor", "offshore"})
        self.assertTrue(any("source_id" in trash.base_metadata() for trash in engine.trash_items))

    def test_trash_transport_uses_current(self) -> None:
        random.seed(12)
        engine = SimulationEngine(
            SimulationConfig(
                scout_count=0,
                collector_count=0,
                marine_life_count=0,
                initial_trash_count=1,
                trash_drift_speed=1.0,
                trash_source_profile="calm",
                current_x=1.0,
                current_y=0.0,
                current_strength=0.2,
                diffusion_strength=0.0,
                convergence_strength=0.0,
                source_outflow_strength=0.0,
            )
        )
        trash = engine.trash_items[0]
        trash.vx = 0.0
        trash.vy = 0.0
        before_x = trash.x

        trash.update(engine)

        self.assertGreater(trash.x, before_x)
        self.assertAlmostEqual(trash.vy, 0.0)

    def test_persistent_collision_is_counted_once_until_separated(self) -> None:
        engine = SimulationEngine(
            SimulationConfig(
                scout_count=1,
                collector_count=1,
                marine_life_count=0,
                initial_trash_count=0,
                scout_speed=0.0,
                collector_speed=0.0,
                random_weight=0.0,
                collision_radius=20,
                steps=10,
            )
        )
        scout = next(agent for agent in engine.agents if isinstance(agent, Scout))
        collector = next(agent for agent in engine.agents if isinstance(agent, Collector))
        scout.x = collector.x = 100
        scout.y = collector.y = 100
        scout.vx = scout.vy = collector.vx = collector.vy = 0.0

        engine.step()
        engine.step()

        self.assertEqual(engine.collisions, 1)

        collector.x = 200
        collector.y = 200
        engine.step()
        collector.x = scout.x
        collector.y = scout.y
        collector.vx = collector.vy = 0.0
        engine.step()

        self.assertEqual(engine.collisions, 2)

    def test_completed_simulation_does_not_spawn_runtime_trash(self) -> None:
        engine = SimulationEngine(
            SimulationConfig(
                scout_count=0,
                collector_count=0,
                marine_life_count=0,
                initial_trash_count=0,
                trash_spawn_interval=1,
                max_trash=10,
                steps=1,
            )
        )

        engine.step()
        count_at_completion = len(engine.trash_items)
        engine.step()

        self.assertEqual(engine.phase, "completed")
        self.assertEqual(len(engine.trash_items), count_at_completion)


if __name__ == "__main__":
    unittest.main()
