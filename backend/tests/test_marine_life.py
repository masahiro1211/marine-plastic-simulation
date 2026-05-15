from __future__ import annotations

import math
import random
import unittest

from app.models.schemas import SimulationConfig
from app.simulation.agents import MarineLife, Predator, Scout, Trash
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
            enable_manual_robot=False,
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
        engine.fish_eat_probability = 1.0
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

    def test_fish_skip_nearby_trash_when_secondly_probability_is_zero(self) -> None:
        engine = self._build_engine()
        engine.fish_eat_probability = 0.0
        fish = self._freeze_fish()
        trash = Trash(x=405, y=300, drift_speed=0.0)
        trash.vx = 0.0
        trash.vy = 0.0
        engine.agents.extend([fish, trash])

        fish.update(engine)

        self.assertTrue(trash.alive)
        self.assertEqual(engine.fish_ate_trash, 0)

    def test_fish_eat_probability_refreshes_once_per_second(self) -> None:
        engine = self._build_engine(tick_interval_ms=50)
        engine.tick = 1
        engine._update_fish_eat_probability()
        first = engine.fish_eat_probability

        engine.tick = 19
        engine._update_fish_eat_probability()
        self.assertEqual(engine.fish_eat_probability, first)

        engine.tick = 20
        engine._update_fish_eat_probability()
        self.assertNotEqual(engine._fish_eat_probability_second, 0)

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
        engine.fish_eat_probability = 1.0
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


class PredatorInteractionTests(unittest.TestCase):
    def _build_engine(self, **overrides: object) -> SimulationEngine:
        random.seed(0)
        config_kwargs = dict(
            scout_count=0,
            collector_count=0,
            marine_life_count=0,
            predator_count=0,
            initial_trash_count=0,
            trash_spawn_interval=0,
            steps=10_000,
            enable_manual_robot=False,
        )
        config_kwargs.update(overrides)
        return SimulationEngine(SimulationConfig(**config_kwargs))

    def test_fish_panic_speed_exceeds_predator_chase(self) -> None:
        cfg = SimulationConfig()
        fish_panic = cfg.marine_life_speed * cfg.panic_speed_factor
        predator_chase = cfg.predator_speed * cfg.predator_chase_speed_factor
        fish_evade = cfg.marine_life_speed * cfg.speed_evade_factor
        # Panicking fish out-run the predator (the chase resolves).
        self.assertGreater(fish_panic, predator_chase)
        # Calmly evading fish stay slower than the predator (the chase has tension).
        self.assertLess(fish_evade, predator_chase)

    def test_select_target_returns_preferred_distance_point(self) -> None:
        engine = self._build_engine()
        predator = Predator(x=100, y=300, speed=engine.config.predator_speed)
        fish = MarineLife(x=250, y=300, speed=engine.config.marine_life_speed)
        engine.agents.extend([predator, fish])

        target = predator._select_target(engine, engine.config)
        self.assertIsNotNone(target)
        tx, ty, anchor = target
        self.assertIs(anchor, fish)
        dist_to_target = math.hypot(tx - predator.x, ty - predator.y)
        self.assertAlmostEqual(
            dist_to_target,
            150 - engine.config.predator_preferred_distance,
            places=6,
        )

    def test_fish_speed_increases_near_predator(self) -> None:
        random.seed(0)
        engine = self._build_engine()
        predator = Predator(x=400, y=300, speed=engine.config.predator_speed)
        fish = MarineLife(x=500, y=300, speed=engine.config.marine_life_speed)
        fish.panic = False
        engine.agents.extend([predator, fish])

        before = fish.speed
        fish.update(engine)
        self.assertGreater(fish.speed, before)

    def test_robot_evasion_still_boosts_speed(self) -> None:
        random.seed(0)
        engine = self._build_engine()
        scout = Scout(x=450, y=300, speed=4.4, sensor_radius=10.0, max_energy=100.0)
        fish = MarineLife(x=500, y=300, speed=engine.config.marine_life_speed)
        fish.panic = False
        engine.agents.extend([scout, fish])

        before = fish.speed
        fish.update(engine)
        # Fleeing a robot (no predator present) must still accelerate the fish.
        self.assertGreater(fish.speed, before)

    def test_panic_burst_boosts_speed_then_decays(self) -> None:
        random.seed(0)
        engine = self._build_engine()
        fish = MarineLife(x=400, y=300, speed=engine.config.marine_life_speed)
        engine.agents.append(fish)
        cfg = engine.config
        sustained = fish.base_speed * cfg.panic_speed_factor

        fish.panic = True
        fish.update(engine)
        # Startle burst makes the onset tick faster than the sustained panic speed.
        self.assertGreater(fish.speed, sustained)

        for _ in range(cfg.panic_burst_ticks + 2):
            fish.update(engine)
        # Once the burst window elapses, speed settles to the sustained panic speed.
        self.assertAlmostEqual(fish.speed, sustained, places=6)

    def test_predator_lunges_on_anchor_panic_onset(self) -> None:
        random.seed(0)
        engine = self._build_engine()
        predator = Predator(x=400, y=300, speed=engine.config.predator_speed)
        fish = MarineLife(x=580, y=300, speed=engine.config.marine_life_speed)
        engine.agents.extend([predator, fish])
        cfg = engine.config
        base_chase = predator.base_speed * cfg.predator_chase_speed_factor

        def pin_fish_ahead_of_predator() -> None:
            # Keep the fish 180 px ahead so the predator never enters orbit
            # range during the assertion window.
            fish.x = predator.x + 180
            fish.y = predator.y

        # First tick: fish calm → no lunge, plain chase speed.
        fish.panic = False
        pin_fish_ahead_of_predator()
        predator.update(engine)
        self.assertAlmostEqual(
            math.hypot(predator.vx, predator.vy), base_chase, places=6
        )

        # Onset: fish enters panic → lunge fires at peak.
        fish.panic = True
        pin_fish_ahead_of_predator()
        predator.update(engine)
        self.assertAlmostEqual(
            math.hypot(predator.vx, predator.vy),
            base_chase * cfg.predator_lunge_factor,
            places=6,
        )

        # After the lunge window, predator returns to plain chase speed.
        for _ in range(cfg.predator_lunge_ticks + 2):
            pin_fish_ahead_of_predator()
            predator.update(engine)
        self.assertAlmostEqual(
            math.hypot(predator.vx, predator.vy), base_chase, places=6
        )

    def test_panic_burst_rearms_while_predator_close(self) -> None:
        random.seed(0)
        engine = self._build_engine()
        predator = Predator(x=400, y=300, speed=engine.config.predator_speed)
        fish = MarineLife(x=420, y=300, speed=engine.config.marine_life_speed)
        fish.panic = True
        engine.agents.extend([predator, fish])
        cfg = engine.config
        peak = fish.base_speed * cfg.panic_speed_factor * cfg.panic_burst_factor

        for _ in range(cfg.panic_burst_ticks * 3):
            # Keep predator pinned just inside predator_panic_radius before
            # each update so the danger_close re-arm path is exercised.
            predator.x = fish.x - 20
            predator.y = fish.y
            fish.update(engine)

        self.assertAlmostEqual(fish.speed, peak, places=6)

    def test_panic_separation_pushes_fish_apart(self) -> None:
        engine = self._build_engine()
        fish_a = MarineLife(x=400, y=300, speed=engine.config.marine_life_speed)
        fish_b = MarineLife(x=420, y=300, speed=engine.config.marine_life_speed)
        engine.agents.extend([fish_a, fish_b])

        fish_a.panic = True
        force = fish_a._panic_separation_force(engine, engine.config)
        # fish_a sits left of fish_b, so the panic repulsion points left.
        self.assertLess(force[0], 0.0)

        fish_a.panic = False
        self.assertEqual(fish_a._panic_separation_force(engine, engine.config), (0.0, 0.0))


if __name__ == "__main__":
    unittest.main()
