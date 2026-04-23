from __future__ import annotations

import math
import random
import unittest

from app.models.schemas import SimulationConfig
from app.simulation.agents import Scout, Trash
from app.simulation.engine import SimulationEngine


def _scout(engine: SimulationEngine) -> Scout:
    return next(agent for agent in engine.agents if isinstance(agent, Scout))


def _trash(engine: SimulationEngine) -> Trash:
    return next(agent for agent in engine.agents if isinstance(agent, Trash))


class ScoutAlbatrossTests(unittest.TestCase):
    """Behavioural tests for Albatross-inspired adaptive scouting."""

    def setUp(self) -> None:
        random.seed(0)

    def _build(self, **overrides) -> SimulationEngine:
        defaults = dict(
            scout_count=1,
            collector_count=0,
            marine_life_count=0,
            initial_trash_count=0,
            steps=200,
            scout_search_duration=5,
            scout_levy_min_steps=5,
            scout_levy_max_steps=20,
            scout_battery_enabled=False,
            random_weight=0.0,
            avoid_robot_weight=0.0,
            avoid_marine_life_weight=0.0,
            trash_spawn_interval=0,
        )
        defaults.update(overrides)
        return SimulationEngine(SimulationConfig(**defaults))

    def test_scout_starts_in_scan_mode(self) -> None:
        engine = self._build()
        scout = _scout(engine)
        self.assertEqual(scout.mode, Scout.SCAN_MODE)

    def test_scan_mode_produces_straight_line_motion(self) -> None:
        engine = self._build(scout_levy_min_steps=15, scout_levy_max_steps=15)
        scout = _scout(engine)
        scout.x = engine.config.width / 2
        scout.y = engine.config.height / 2
        scout.scan_steps_remaining = 0

        engine.start()
        engine.step()
        heading = scout.scan_heading
        first_vx, first_vy = scout.vx, scout.vy

        engine.step()
        engine.step()
        # Heading is fixed for a leg, so velocity stays parallel
        self.assertAlmostEqual(scout.scan_heading, heading)
        self.assertAlmostEqual(math.hypot(first_vx, first_vy), scout.speed, places=5)

    def test_scan_switches_to_search_when_trash_detected(self) -> None:
        engine = self._build(initial_trash_count=1, scout_sensor_radius=200)
        scout = _scout(engine)
        trash = _trash(engine)
        scout.x = 100
        scout.y = 100
        trash.x = 110
        trash.y = 110

        engine.start()
        engine.step()

        self.assertEqual(scout.mode, Scout.SEARCH_MODE)
        self.assertEqual(scout.search_ticks_without_find, 0)

    def test_search_reverts_to_scan_after_threshold_empty_ticks(self) -> None:
        engine = self._build(scout_search_duration=4)
        scout = _scout(engine)
        scout.mode = Scout.SEARCH_MODE
        scout.search_ticks_without_find = 0

        engine.start()
        for _ in range(3):
            engine.step()
        self.assertEqual(scout.mode, Scout.SEARCH_MODE)

        engine.step()
        # On the tick the counter reaches the threshold, mode flips back
        self.assertEqual(scout.mode, Scout.SCAN_MODE)

    def test_battery_disabled_keeps_energy_full(self) -> None:
        engine = self._build(scout_battery_enabled=False, max_energy=100.0)
        scout = _scout(engine)
        engine.start()
        for _ in range(20):
            engine.step()
        self.assertEqual(scout.energy, 100.0)

    def test_battery_enabled_drains_energy(self) -> None:
        engine = self._build(
            scout_battery_enabled=True,
            max_energy=100.0,
            energy_drain_per_tick=1.0,
            low_energy_threshold=0.0,
        )
        scout = _scout(engine)
        scout.x = 50
        scout.y = 50
        engine.start()
        engine.step()
        self.assertLess(scout.energy, 100.0)

    def test_metadata_exposes_foraging_mode(self) -> None:
        engine = self._build()
        scout = _scout(engine)
        scout.mode = Scout.SEARCH_MODE
        snapshot = engine.get_snapshot()
        scout_state = next(a for a in snapshot["agents"] if a["role"] == "scout")
        self.assertEqual(scout_state["metadata"]["foraging_mode"], "search")

    def test_levy_step_within_bounds(self) -> None:
        for _ in range(200):
            step = Scout._sample_levy_step(10, 50, 2.0)
            self.assertGreaterEqual(step, 10)
            self.assertLessEqual(step, 50)


if __name__ == "__main__":
    unittest.main()
