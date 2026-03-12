from __future__ import annotations

import math
import random

from app.simulation.agents.base import BaseAgent


class Plastic(BaseAgent):
    """海洋を漂流するプラスチックごみエージェント。

    擬似的な海流に乗ってゆっくりと漂流する。
    魚に近づくとダメージを与える。
    """

    AGENT_TYPE = "plastic"

    def __init__(self, x: float, y: float, drift_speed: float = 0.3):
        """プラスチックごみエージェントを初期化する。

        Args:
            x: 初期X座標。
            y: 初期Y座標。
            drift_speed: 漂流速度。デフォルトは0.3。
        """
        super().__init__(x, y)
        self.drift_speed = drift_speed
        self.energy = 999.0

    def update(self, agents: list[BaseAgent], width: float, height: float) -> None:
        """プラスチックの状態を1ティック分更新する。

        海流に乗って漂流し、微小なランダム角度変化を加える。

        Args:
            agents: シミュレーション内の全エージェントのリスト。
            width: フィールドの幅。
            height: フィールドの高さ。
        """
        if not self.alive:
            return
        self.x += math.cos(self.angle) * self.drift_speed
        self.y += math.sin(self.angle) * self.drift_speed * 0.5
        self.angle += random.uniform(-0.05, 0.05)
        self.wrap_position(width, height)
