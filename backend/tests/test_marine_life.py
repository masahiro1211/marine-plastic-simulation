from __future__ import annotations

import random
import unittest

from app.models.schemas import SimulationConfig
from app.simulation.agents import MarineLife, Scout, Trash
from app.simulation.engine import SimulationEngine


class MarineLifeContactTests(unittest.TestCase):
    def _build_engine(self, **overrides: object) -> SimulationEngine:
        random.seed(0)
        config_kwargs = dict(
            scout_count=0,
            collector_count=0,
            marine_life_count=0,
            initial_trash_count=0,
            trash_spawn_interval=0,
            steps=10_000,
            marine_life_avoid_radius=200,
            fish_eat_radius=20,
        )
        config_kwargs.update(overrides)
        return SimulationEngine(SimulationConfig(**config_kwargs))

    def _freeze_fish(self) -> MarineLife:
        fish = MarineLife(x=400, y=300, speed=0.0)
        fish.vx = 0.0
        fish.vy = 0.0
        return fish

    def test_edge_detection_counts_on_entry_only(self) -> None:
        engine = self._build_engine()
        fish = self._freeze_fish()
        scout = Scout(x=0, y=0, speed=0.0, sensor_radius=10.0, max_energy=100.0)
        engine.agents.extend([fish, scout])

        scout.x, scout.y = 0, 0
        fish.update(engine)
        self.assertEqual(fish.contact_count, 0)
        self.assertEqual(engine.robot_fish_contacts, 0)

        scout.x, scout.y = 400, 300
        fish.update(engine)
        self.assertEqual(fish.contact_count, 1)
        self.assertEqual(engine.robot_fish_contacts, 1)

        fish.update(engine)
        fish.update(engine)
        self.assertEqual(fish.contact_count, 1)
        self.assertEqual(engine.robot_fish_contacts, 1)

        scout.x, scout.y = 0, 0
        fish.update(engine)
        self.assertEqual(fish.contact_count, 1)

        scout.x, scout.y = 400, 300
        fish.update(engine)
        self.assertEqual(fish.contact_count, 2)
        self.assertEqual(engine.robot_fish_contacts, 2)

    def test_no_lost_state_under_continuous_presence(self) -> None:
        engine = self._build_engine()
        fish = self._freeze_fish()
        scout = Scout(x=400, y=300, speed=0.0, sensor_radius=10.0, max_energy=100.0)
        engine.agents.extend([fish, scout])

        for _ in range(200):
            scout.x, scout.y = 400, 300
            fish.update(engine)

        self.assertTrue(fish.alive)
        self.assertEqual(len(engine.marine_life), 1)

    def test_fish_eats_nearby_trash(self) -> None:
        engine = self._build_engine()
        fish = self._freeze_fish()
        trash = Trash(x=405, y=300, drift_speed=0.0)
        trash.vx = 0.0
        trash.vy = 0.0
        engine.agents.extend([fish, trash])

        fish.update(engine)

        self.assertFalse(trash.alive)
        self.assertEqual(engine.fish_ate_trash, 1)
        self.assertEqual(fish.ate_trash_count, 1)
        self.assertEqual(fish.speed, 0.0)
        self.assertNotIn(fish.status, {"sick", "lost"})

    def test_no_stress_field_on_snapshot(self) -> None:
        engine = self._build_engine(marine_life_count=1)
        snapshot = engine.get_snapshot()

        for agent in snapshot["agents"]:
            self.assertNotIn("stress", agent["metadata"])
        self.assertNotIn("marine_life_stress", snapshot["score"])
        self.assertIn("robot_fish_contacts", snapshot["stats"])
        self.assertIn("fish_ate_trash", snapshot["stats"])

    def test_stats_counters_reset_on_engine_reset(self) -> None:
        engine = self._build_engine()
        fish = self._freeze_fish()
        scout = Scout(x=400, y=300, speed=0.0, sensor_radius=10.0, max_energy=100.0)
        trash = Trash(x=405, y=300, drift_speed=0.0)
        trash.vx = 0.0
        trash.vy = 0.0
        engine.agents.extend([fish, scout, trash])

        fish.update(engine)
        self.assertEqual(engine.robot_fish_contacts, 1)
        self.assertEqual(engine.fish_ate_trash, 1)

        engine.reset()

        self.assertEqual(engine.robot_fish_contacts, 0)
        self.assertEqual(engine.fish_ate_trash, 0)


if __name__ == "__main__":
    unittest.main()
