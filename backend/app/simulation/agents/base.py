from __future__ import annotations

import math
import random
from abc import ABC, abstractmethod


class BaseAgent(ABC):
    """シミュレーション上の全エージェントの抽象基底クラス。

    全てのエージェントはこのクラスを継承し、`update()` メソッドを実装する必要がある。
    """

    AGENT_TYPE: str = "base"

    _id_counter: int = 0

    def __init__(self, x: float, y: float):
        """エージェントを初期化する。

        Args:
            x: エージェントの初期X座標。
            y: エージェントの初期Y座標。
        """
        BaseAgent._id_counter += 1
        self.id: int = BaseAgent._id_counter
        self.x: float = x
        self.y: float = y
        self.angle: float = random.uniform(0, 2 * math.pi)
        self.energy: float = 100.0
        self.alive: bool = True

    def distance_to(self, other: BaseAgent) -> float:
        """他のエージェントまでのユークリッド距離を計算する。

        Args:
            other: 距離を計算する対象のエージェント。

        Returns:
            自身と対象エージェント間の距離。
        """
        return math.hypot(self.x - other.x, self.y - other.y)

    def angle_to(self, other: BaseAgent) -> float:
        """他のエージェントへの角度（ラジアン）を計算する。

        Args:
            other: 角度を計算する対象のエージェント。

        Returns:
            自身から対象エージェントへの角度（ラジアン）。
        """
        return math.atan2(other.y - self.y, other.x - self.x)

    def wrap_position(self, width: float, height: float) -> None:
        """座標がフィールド外に出た場合、反対側にラップアラウンドさせる。

        Args:
            width: フィールドの幅。
            height: フィールドの高さ。
        """
        self.x = self.x % width
        self.y = self.y % height

    def neighbours_by_type(
        self,
        agents: list[BaseAgent],
        agent_type: str,
        radius: float,
    ) -> list[BaseAgent]:
        """指定した種類かつ半径内にいる近隣エージェントのリストを返す。

        Args:
            agents: 全エージェントのリスト。
            agent_type: フィルタ対象のエージェント種別文字列。
            radius: 検索半径。

        Returns:
            条件に一致する近隣エージェントのリスト。
        """
        return [
            a
            for a in agents
            if a is not self
            and a.alive
            and a.AGENT_TYPE == agent_type
            and self.distance_to(a) < radius
        ]

    def to_dict(self) -> dict:
        """エージェントの状態を辞書形式で返す。

        Returns:
            エージェントの属性を含む辞書。
        """
        return {
            "id": self.id,
            "agent_type": self.AGENT_TYPE,
            "x": self.x,
            "y": self.y,
            "angle": self.angle,
            "energy": self.energy,
            "alive": self.alive,
        }

    @abstractmethod
    def update(self, agents: list[BaseAgent], width: float, height: float) -> None:
        """エージェントの状態を1ティック分更新する。

        サブクラスで必ず実装すること。

        Args:
            agents: シミュレーション内の全エージェントのリスト。
            width: フィールドの幅。
            height: フィールドの高さ。
        """
        ...

    @classmethod
    def reset_id_counter(cls) -> None:
        """エージェントIDカウンタを0にリセットする。"""
        cls._id_counter = 0
