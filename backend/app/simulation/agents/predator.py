from __future__ import annotations

import math
import random

from app.simulation.agents.base import BaseAgent


class Predator(BaseAgent):
    """小型魚を追跡・捕食する大型捕食魚エージェント。

    近くの魚を探索し、最も近い魚に向かって移動して捕食する。
    エネルギーが尽きると死亡する。
    """

    AGENT_TYPE = "predator"

    CHASE_RADIUS = 150.0
    EAT_RADIUS = 10.0

    def __init__(self, x: float, y: float, speed: float = 1.5):
        """捕食魚エージェントを初期化する。

        Args:
            x: 初期X座標。
            y: 初期Y座標。
            speed: 移動速度。デフォルトは1.5。
        """
        super().__init__(x, y)
        self.speed = speed
        self.energy = 150.0

    def update(self, agents: list[BaseAgent], width: float, height: float) -> None:
        """捕食魚の状態を1ティック分更新する。

        最も近い魚を追跡し、捕食範囲内であれば捕食してエネルギーを回復する。
        魚が見つからない場合はランダムに方向転換する。

        Args:
            agents: シミュレーション内の全エージェントのリスト。
            width: フィールドの幅。
            height: フィールドの高さ。
        """
        if not self.alive:
            return

        nearby_fish = self.neighbours_by_type(agents, "fish", self.CHASE_RADIUS)
        nearest_fish = None
        nearest_dist = float("inf")
        for f in nearby_fish:
            d = self.distance_to(f)
            if d < nearest_dist:
                nearest_fish = f
                nearest_dist = d

        if nearest_fish is not None:
            target_angle = self.angle_to(nearest_fish)
            diff = (target_angle - self.angle + math.pi) % (2 * math.pi) - math.pi
            self.angle += diff * 0.08

            if nearest_dist < self.EAT_RADIUS:
                nearest_fish.alive = False
                self.energy = min(self.energy + 30, 200)
        else:
            self.angle += random.uniform(-0.2, 0.2)

        self.energy -= 0.1
        if self.energy <= 0:
            self.alive = False
            return

        self.x += math.cos(self.angle) * self.speed
        self.y += math.sin(self.angle) * self.speed
        self.wrap_position(width, height)
