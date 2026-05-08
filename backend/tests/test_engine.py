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
if __name__ == "__main__":
    unittest.main()
