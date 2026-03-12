"""海洋プラスチックシミュレーションのFastAPIアプリケーションエントリポイント。

CORSミドルウェアの設定と各APIルーターの登録を行う。
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.config import router as config_router
from app.api.simulation import router as simulation_router
from app.api.stats import router as stats_router
from app.api.ws import router as ws_router

app = FastAPI(title="Marine Plastic Simulation")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(simulation_router)
app.include_router(config_router)
app.include_router(stats_router)
app.include_router(ws_router)
