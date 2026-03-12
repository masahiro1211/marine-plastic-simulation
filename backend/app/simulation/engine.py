from __future__ import annotations

import random
from collections import deque

from app.models.schemas import SimulationConfig, StatsEntry
from app.simulation.agents import BaseAgent, Fish, Plastic, Predator


MAX_HISTORY = 500  # keep last N ticks of stats


class SimulationEngine:
    """マルチエージェント海洋シミュレーションの管理エンジン。

    エージェントの初期化、ティック更新、リセット、
    統計情報の記録・取得を行う。
    """

    def __init__(self, config: SimulationConfig | None = None):
        """シミュレーションエンジンを初期化する。

        Args:
            config: シミュレーション設定。Noneの場合はデフォルト設定を使用する。
        """
        self.config = config or SimulationConfig()
        self.agents: list[BaseAgent] = []
        self.tick: int = 0
        self.running: bool = False
        self.stats_history: deque[StatsEntry] = deque(maxlen=MAX_HISTORY)
        self._init_agents()

    # ------------------------------------------------------------------
    # Agent initialisation
    # ------------------------------------------------------------------

    def _init_agents(self) -> None:
        """設定に基づいて全エージェントを生成・配置する。"""
        BaseAgent.reset_id_counter()
        self.agents.clear()
        w, h = self.config.width, self.config.height

        for _ in range(self.config.num_fish):
            self.agents.append(
                Fish(random.uniform(0, w), random.uniform(0, h), self.config.fish_speed)
            )

        for _ in range(self.config.num_predators):
            self.agents.append(
                Predator(
                    random.uniform(0, w),
                    random.uniform(0, h),
                    self.config.predator_speed,
                )
            )

        for _ in range(self.config.num_plastics):
            self.agents.append(
                Plastic(
                    random.uniform(0, w),
                    random.uniform(0, h),
                    self.config.plastic_drift_speed,
                )
            )

    # ------------------------------------------------------------------
    # Simulation control
    # ------------------------------------------------------------------

    def step(self) -> None:
        """シミュレーションを1ティック進める。

        全エージェントの状態を更新し、統計情報を記録する。
        """
        self.tick += 1
        for agent in self.agents:
            agent.update(self.agents, self.config.width, self.config.height)

        entry = self._current_stats()
        self.stats_history.append(entry)

    def reset(self, config: SimulationConfig | None = None) -> None:
        """シミュレーションをリセットする。

        Args:
            config: 新しいシミュレーション設定。Noneの場合は現在の設定を維持する。
        """
        if config:
            self.config = config
        self.tick = 0
        self.stats_history.clear()
        self._init_agents()

    # ------------------------------------------------------------------
    # Queries
    # ------------------------------------------------------------------

    def _current_stats(self) -> StatsEntry:
        """現在のティックにおけるエージェント数の統計情報を生成する。

        Returns:
            魚・捕食者・プラスチックの生存数を含む統計エントリ。
        """
        fish = sum(1 for a in self.agents if a.AGENT_TYPE == "fish" and a.alive)
        predators = sum(1 for a in self.agents if a.AGENT_TYPE == "predator" and a.alive)
        plastics = sum(1 for a in self.agents if a.AGENT_TYPE == "plastic" and a.alive)
        return StatsEntry(
            tick=self.tick,
            fish=fish,
            predators=predators,
            plastics=plastics,
            total=fish + predators + plastics,
        )

    def get_snapshot(self) -> dict:
        """全エージェントの現在の状態をスナップショットとして返す。

        Returns:
            ティック数、生存エージェント一覧、統計情報を含む辞書。
        """
        stats = self._current_stats()
        return {
            "tick": self.tick,
            "agents": [a.to_dict() for a in self.agents if a.alive],
            "stats": stats.model_dump(),
        }

    def get_stats_history(self) -> list[dict]:
        """記録された統計情報の履歴を返す。

        Returns:
            グラフ描画用の統計エントリ辞書のリスト。
        """
        return [entry.model_dump() for entry in self.stats_history]
