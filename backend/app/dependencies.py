"""シミュレーションエンジンの依存性注入モジュール。

アプリケーション全体で共有されるシミュレーションエンジンのシングルトンインスタンスを提供する。
"""

from app.simulation.engine import SimulationEngine

_engine = SimulationEngine()


def get_engine() -> SimulationEngine:
    """シミュレーションエンジンのシングルトンインスタンスを取得する。

    Returns:
        アプリケーション共有のSimulationEngineインスタンス。
    """
    return _engine
