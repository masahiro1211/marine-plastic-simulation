"""WebSocketによるリアルタイムシミュレーション通信を行うルーター。"""

import asyncio

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from app.dependencies import get_engine
from app.models.schemas import SimulationConfig

router = APIRouter(tags=["websocket"])


@router.websocket("/ws/simulation")
async def simulation_ws(websocket: WebSocket):
    """WebSocket接続でシミュレーションをリアルタイムに実行・配信する。

    クライアントからのアクション（stop, reset, update_config）を受け付けつつ、
    ティックごとにスナップショットをクライアントへ送信する。

    Args:
        websocket: クライアントとのWebSocket接続。
    """
    engine = get_engine()
    await websocket.accept()
    engine.start()
    try:
        while True:
            try:
                data = await asyncio.wait_for(
                    websocket.receive_json(), timeout=0.01
                )
                action = data.get("action")
                if action == "stop":
                    engine.stop()
                elif action == "reset":
                    config_data = data.get("config")
                    if config_data:
                        engine.reset(SimulationConfig(**config_data))
                    else:
                        engine.reset()
                    engine.start()
                elif action == "update_config":
                    config_data = data.get("config", {})
                    engine.reset(SimulationConfig(**config_data))
                elif action == "start":
                    engine.start()
                # 追加開始: 手動ロボットの操作シグナルを受け取る 
                elif action == "manual_move":
                    vx = data.get("vx", 0.0)
                    vy = data.get("vy", 0.0)
                    # 全エージェントの中から手動ロボットを探して、入力された方向をセットする
                    for agent in engine.collectors:
                        if getattr(agent, "is_manual", False):
                            agent.manual_vx = vx
                            agent.manual_vy = vy
                #  追加終了 
            except asyncio.TimeoutError:
                pass

            snapshot = engine.get_snapshot()
            if engine.running:
                engine.step()
                snapshot = engine.get_snapshot()
            await websocket.send_json(snapshot)
            if engine.phase == "completed" and not engine.running:
                break
            await asyncio.sleep(engine.config.tick_interval_ms / 1000)
    except WebSocketDisconnect:
        engine.stop()
