from __future__ import annotations

from pydantic import BaseModel


class SimulationConfig(BaseModel):
    """シミュレーションの設定パラメータを定義するスキーマ。

    フィールドサイズ、各エージェントの数・速度、ティック間隔を保持する。
    """

    width: float = 800
    height: float = 600
    num_fish: int = 50
    num_predators: int = 5
    num_plastics: int = 30
    fish_speed: float = 2.0
    predator_speed: float = 1.5
    plastic_drift_speed: float = 0.3
    tick_interval_ms: int = 50


class AgentState(BaseModel):
    """個別エージェントの状態を表すスキーマ。

    エージェントのID、種別、座標、角度、エネルギー、生存状態を保持する。
    """

    id: int
    agent_type: str
    x: float
    y: float
    angle: float
    energy: float
    alive: bool


class StatsEntry(BaseModel):
    """1ティック分の統計情報を表すスキーマ。

    各エージェント種別の生存数と合計数を保持する。
    """

    tick: int
    fish: int
    predators: int
    plastics: int
    total: int


class SimulationSnapshot(BaseModel):
    """シミュレーションのスナップショットを表すスキーマ。

    現在のティック数、全エージェントの状態、統計情報を保持する。
    """

    tick: int
    agents: list[AgentState]
    stats: StatsEntry
