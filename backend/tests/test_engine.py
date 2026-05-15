from __future__ import annotations

import unittest
import random

from app.models.schemas import SimulationConfig
from app.simulation.engine import SimulationEngine
from app.simulation.agents import Collector, MarineLife, Predator, Trash


class SimulationEngineTests(unittest.TestCase):
    def test_snapshot_uses_new_contract(self) -> None:
        engine = SimulationEngine(
            SimulationConfig(
                scout_count=1,
                collector_count=1,
                marine_life_count=1,
                initial_trash_count=1,
                steps=10,
                enable_manual_robot=False,
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
                enable_manual_robot=False,
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
        self.assertEqual(engine.get_snapshot()["score"]["total"], 12)

    def test_default_runtime_is_about_five_minutes(self) -> None:
        config = SimulationConfig()

        self.assertEqual(config.steps, 6000)
        self.assertEqual(config.tick_interval_ms, 50)
        self.assertEqual(config.steps * config.tick_interval_ms, 300_000)

    def test_score_upgrade_enables_speed_and_two_trash_capacity(self) -> None:
        engine = SimulationEngine(
            SimulationConfig(
                scout_count=0,
                collector_count=1,
                marine_life_count=0,
                initial_trash_count=0,
                enable_manual_robot=False,
                predator_count=0,
                trash_spawn_interval=0,
                collector_speed=4.0,
            )
        )
        collector = next(agent for agent in engine.collectors if not agent.is_manual)

        engine.delivered_trash = 41
        collector.update(engine)
        self.assertFalse(collector.is_upgraded)
        self.assertEqual(engine.collector_carrying_capacity(), 1)
        self.assertEqual(collector.speed, 4.0)

        engine.delivered_trash = 42
        collector.update(engine)
        self.assertTrue(collector.is_upgraded)
        self.assertEqual(engine.collector_carrying_capacity(), 2)
        self.assertGreater(collector.speed, 4.0)

    def test_upgraded_collector_can_carry_and_deliver_two_trash(self) -> None:
        engine = SimulationEngine(
            SimulationConfig(
                scout_count=0,
                collector_count=1,
                marine_life_count=0,
                initial_trash_count=0,
                enable_manual_robot=False,
                predator_count=0,
                trash_spawn_interval=0,
            )
        )
        collector = next(agent for agent in engine.collectors if not agent.is_manual)
        engine.delivered_trash = 42
        trash_a = Trash(engine.base.x, engine.base.y, 0.0)
        trash_b = Trash(engine.base.x, engine.base.y, 0.0)
        engine.agents.extend([trash_a, trash_b])

        engine.pick_trash(collector, trash_a)
        engine.pick_trash(collector, trash_b)

        self.assertEqual(collector.carrying_trash_ids, [trash_a.id, trash_b.id])
        collector.x = engine.base.x
        collector.y = engine.base.y
        engine._resolve_base_interactions()

        self.assertEqual(engine.delivered_trash, 44)
        self.assertEqual(collector.carrying_trash_ids, [])

    def test_score_1000_completes_simulation(self) -> None:
        engine = SimulationEngine(
            SimulationConfig(
                scout_count=0,
                collector_count=0,
                marine_life_count=0,
                initial_trash_count=0,
                enable_manual_robot=False,
                predator_count=0,
                trash_spawn_interval=0,
                steps=6000,
            )
        )
        engine.delivered_trash = 83
        engine.start()
        engine.step()
        self.assertEqual(engine.phase, "running")

        engine.delivered_trash = 84
        engine.step()
        self.assertEqual(engine.phase, "completed")
        self.assertFalse(engine.running)

    def test_manual_collector_does_not_stop_on_delivery_collision(self) -> None:
        engine = SimulationEngine(
            SimulationConfig(
                scout_count=0,
                collector_count=1,
                marine_life_count=0,
                initial_trash_count=0,
                enable_manual_robot=True,
                predator_count=0,
                collector_speed=0,
                random_weight=0,
                trash_spawn_interval=0,
                manual_penalty_ticks=50,
            )
        )
        manual = next(agent for agent in engine.collectors if agent.is_manual)
        auto = next(agent for agent in engine.collectors if not agent.is_manual)
        manual.x = auto.x = engine.base.x
        manual.y = auto.y = engine.base.y
        manual.carrying_trash_id = "trash-delivery"

        engine.start()
        engine.step()

        self.assertEqual(engine.delivered_trash, 1)
        self.assertIsNone(manual.carrying_trash_id)
        self.assertEqual(manual.slowdown_ticks, 0)

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
                enable_manual_robot=False,
                predator_count=0,
                steps=10,
            )
        )

        engine.step()

        self.assertEqual(len(engine.trash_items), 2)
        self.assertLessEqual(len(engine.trash_items), engine.config.max_trash)

    def test_runtime_trash_uses_source_pressure_bursts(self) -> None:
        random.seed(14)
        engine = SimulationEngine(
            SimulationConfig(
                scout_count=0,
                collector_count=0,
                marine_life_count=0,
                initial_trash_count=0,
                trash_spawn_interval=1,
                max_trash=10,
                trash_cluster_min=1,
                trash_cluster_max=1,
                trash_source_profile="rain",
                enable_manual_robot=False,
                predator_count=0,
                steps=10,
            )
        )
        engine._trash_source_pressure = {
            "river_mouth": 9.0,
            "coastal_city": 0.0,
            "harbor": 0.0,
            "offshore": 0.0,
        }

        engine.step()

        self.assertGreaterEqual(len(engine.trash_items), 2)
        self.assertLessEqual(len(engine.trash_items), engine.config.max_trash)
        self.assertTrue(any(trash.source_id == "river_mouth" for trash in engine.trash_items))

    def test_source_profile_adds_source_metadata(self) -> None:
        random.seed(11)
        engine = SimulationEngine(
            SimulationConfig(
                scout_count=0,
                collector_count=0,
                marine_life_count=0,
                initial_trash_count=6,
                trash_source_profile="harbor",
                enable_manual_robot=False,
                predator_count=0,
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
                enable_manual_robot=False,
                predator_count=0,
            )
        )
        trash = engine.trash_items[0]
        trash.vx = 0.0
        trash.vy = 0.0
        before_x = trash.x

        trash.update(engine)

        self.assertGreater(trash.x, before_x)
        self.assertAlmostEqual(trash.vy, 0.0)

    def test_collision_cooldown_and_penalty_guards(self) -> None:
        """同一ペアの衝突クールダウン、独立カウント、およびスロウ上書き防止のテスト"""
        # 手動ロボット1体、自動ロボット2体でシミュレーションを準備
        engine = SimulationEngine(
            SimulationConfig(
                scout_count=0,
                collector_count=2,  # 自動2体
                marine_life_count=0,
                initial_trash_count=0,
                enable_manual_robot=True,  # 手動1体追加
                collision_cooldown_ticks=30,
                manual_penalty_ticks=200,
            )
        )

        # ロボットの抽出
        manual = next(r for r in engine.collectors if getattr(r, "is_manual", False))
        autos = [r for r in engine.collectors if not getattr(r, "is_manual", False)]
        auto1 = autos[0]
        auto2 = autos[1]

        # 3体を同じ座標（衝突距離内）に配置
        manual.x = manual.y = 100
        auto1.x = auto1.y = 100

        # auto2は一旦遠くへ避難させておく
        auto2.x = auto2.y = 9999

        # --- 基準1＆2: 初回の衝突 ---
        engine.tick = 1
        engine._resolve_collisions()
        self.assertEqual(engine.collisions, 1, "初回の衝突がカウントされること")
        self.assertEqual(manual.slowdown_ticks, 200, "手動ロボットにペナルティが適用されること")

        # --- 基準1＆2: クールダウン期間中の連続衝突 ---
        engine.tick = 2
        manual.slowdown_ticks = 199  # 1tick経過してペナルティが減ったと仮定
        engine._resolve_collisions()
        self.assertEqual(engine.collisions, 1, "クールダウン中はスコアが増えないこと")
        self.assertEqual(manual.slowdown_ticks, 199, "スロウ中のペナルティ期間が200に上書きされないこと")

        # --- 基準1: クールダウン経過後 ---
        engine.tick = 35
        engine._resolve_collisions()
        self.assertEqual(engine.collisions, 2, "クールダウン後は再びカウントされること")

        # --- 基準3: 異なるペアの独立カウント確認 ---
        # 遠くにいたauto2を戻して、auto1と衝突させる（manualとは離す）
        manual.x = manual.y = 9999
        auto2.x = auto2.y = 100
        engine.tick = 36
        engine._resolve_collisions()

        # auto1 と auto2 は「初めてのペア」なので、クールダウンに関係なく即座にカウントされる
        self.assertEqual(engine.collisions, 3, "異なるペアの衝突は独立して即座にカウントされること")

    def test_manual_collector_remains_controllable_during_collision_penalty(self) -> None:
        engine = SimulationEngine(
            SimulationConfig(
                scout_count=0,
                collector_count=0,
                marine_life_count=0,
                initial_trash_count=0,
                enable_manual_robot=True,
                predator_count=0,
                collector_speed=4.0,
                manual_penalty_ticks=10,
                trash_spawn_interval=0,
            )
        )
        manual = next(agent for agent in engine.collectors if agent.is_manual)
        manual.apply_collision_penalty(engine.config.manual_penalty_ticks)
        manual.manual_vx = 1.0
        manual.manual_vy = 0.0

        manual.update(engine)

        self.assertGreater(manual.x, engine.config.width / 2)
        self.assertGreater(manual.vx, 0.0)
        self.assertEqual(manual.status, "slowed_down")

    def test_push_fish_from_predators_removes_overlap(self) -> None:
        engine = SimulationEngine(
            SimulationConfig(
                scout_count=0,
                collector_count=0,
                marine_life_count=0,
                predator_count=0,
                initial_trash_count=0,
                trash_spawn_interval=0,
                steps=10,
                enable_manual_robot=False,
            )
        )
        predator = Predator(x=400, y=300, speed=engine.config.predator_speed)
        fish = MarineLife(x=410, y=300, speed=engine.config.marine_life_speed)
        engine.agents.extend([predator, fish])

        min_dist = predator.radius + fish.radius
        self.assertLess(predator.distance_to(fish), min_dist)

        engine._push_fish_from_predators()

        self.assertGreaterEqual(predator.distance_to(fish), min_dist - 1e-6)


if __name__ == "__main__":
    unittest.main()
