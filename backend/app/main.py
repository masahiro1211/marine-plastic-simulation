"""海洋プラスチックシミュレーションのFastAPIアプリケーションエントリポイント。

CORSミドルウェアの設定と各APIルーターの登録を行う。
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware

from app.api.config import router as config_router
from app.api.simulation import router as simulation_router
from app.api.stats import router as stats_router
from app.api.ws import router as ws_router
from app.security import allowed_hosts, allowed_origin_regex, allowed_origins

app = FastAPI(title="Marine Plastic Simulation")

app.add_middleware(
    TrustedHostMiddleware,
    allowed_hosts=allowed_hosts(),
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins(),
    allow_origin_regex=allowed_origin_regex(),
    allow_credentials=False,
    allow_methods=["GET", "POST", "PUT"],
    allow_headers=["Content-Type"],
)


@app.get("/healthz", include_in_schema=False)
def healthz() -> dict[str, str]:
    """Return a small health response for platform readiness checks."""
    return {"status": "ok"}


app.include_router(simulation_router)
app.include_router(config_router)
app.include_router(stats_router)
app.include_router(ws_router)
