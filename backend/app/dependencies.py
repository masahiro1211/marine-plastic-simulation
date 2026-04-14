"""シミュレーションエンジンの依存性注入モジュール。

アプリケーション全体で共有されるシミュレーションエンジンのシングルトンインスタンスを提供する。
"""

from app.simulation.engine import SimulationEngine

_engine = SimulationEngine()


def get_engine() -> SimulationEngine:
    """Return the shared simulation engine instance.

    Returns:
        SimulationEngine: Application-wide singleton runtime.
    """
    return _engine
