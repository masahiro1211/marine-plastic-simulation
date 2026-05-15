# Marine Cleanup Robot Simulation

海洋ごみ回収ロボットと海洋生物の相互作用を可視化するリアルタイムシミュレーションです。  
Scout がごみを見つけ、Collector が回収して基地へ搬入し、Marine Life はロボット接近に応じて stress を蓄積します。

## Stack

| Layer | Tech |
|---|---|
| Backend | Python 3.12 / FastAPI / WebSocket |
| Frontend | React 19 / TypeScript / Vite / Tailwind CSS / Canvas API |
| Infra | Docker / Docker Compose |
| Verification | unittest / GitHub Actions |

## Run With Docker

前提:

- Docker Desktop または Docker Engine
- Compose plugin が使えること

起動:

```bash
docker compose up --build
```

公開先:

- Frontend: `http://localhost:3000`
- Backend API: `http://localhost:8000`
- Swagger: `http://localhost:8000/docs`

## Local Development

### Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

### Frontend

```bash
cd frontend
npm install
npm run typecheck
npm start
```

## Production Deployment

このリポジトリは backend を Render、frontend を Vercel に分けてデプロイします。

### 1. Backend: Render

Render ではルートの `render.yaml` を Blueprint として使えます。手動作成する場合は以下です。

| Setting | Value |
|---|---|
| Runtime | Python |
| Root Directory | `backend` |
| Build Command | `pip install --upgrade pip && pip install -r requirements.txt` |
| Start Command | `uvicorn app.main:app --host 0.0.0.0 --port $PORT` |
| Health Check Path | `/healthz` |

Render の Environment Variables:

```text
PYTHON_VERSION=3.12.8
ALLOWED_ORIGINS=https://your-vercel-app.vercel.app
ALLOWED_HOSTS=marine-plastic-simulation-api.onrender.com,*.onrender.com
```

Render の公開 URL が `https://marine-plastic-simulation-api.onrender.com` 以外になった場合は、`ALLOWED_HOSTS` の先頭を実際のホスト名に置き換えてください。

### 2. Frontend: Vercel

ルートの `vercel.json` は monorepo 直下から `frontend` をビルドする設定です。Vercel の Environment Variables には、Render の公開 URL を入れます。

```text
VITE_API_URL=https://marine-plastic-simulation-api.onrender.com
VITE_WS_URL=wss://marine-plastic-simulation-api.onrender.com/ws/simulation
```

`VITE_WS_URL` は省略可能です。省略した場合は `VITE_API_URL` から `wss://.../ws/simulation` を自動生成します。

### 3. CORS Update

Vercel のデプロイ URL が確定したら、Render 側の `ALLOWED_ORIGINS` を実際の Vercel URL に更新して再デプロイします。プレビュー環境も使う場合は、カンマ区切りで追加します。

```text
ALLOWED_ORIGINS=https://your-app.vercel.app,https://your-preview.vercel.app
```

## Tests

### Backend

```bash
cd backend
source .venv/bin/activate
python -m unittest discover -s tests -v
```

### Frontend

```bash
cd frontend
npm run typecheck
npm run test:gltf-assets
npm run build
```

## Game Model

### Agents

- `scout`: ごみ検知と共有
- `collector`: ごみ回収と基地搬入
- `marine_life`: 回避行動と stress 管理
- `trash`: 漂流ごみ

### Base

- 基地は画面下部の固定座標
- ごみ搬入と充電を同じ地点で行う
- バッテリー 0 でも低速帰還モードで基地へ戻る

### Scoring

- `trash_delivered` が多いほど加点
- `collisions` が多いほど減点
- `marine_life_stress` が高いほど減点
- `energy_remaining` が多いほど加点

## Main Files

```text
backend/app/models/schemas.py            # Config / Snapshot / Score 契約
backend/app/simulation/engine.py         # メインシミュレーションループ
backend/app/simulation/agents/           # scout / collector / marine_life / trash
backend/app/api/                         # REST / WebSocket
backend/tests/test_engine.py             # バックエンドの unit tests
frontend/src/components/                 # ControlPanel / Canvas / StatsPanel
frontend/src/renderers/                  # 各エージェント描画
.github/workflows/ci.yml                 # CI
documents/                               # 実装判断の要約
program_docs/                            # 詳細仕様
```

## Documentation

- 実装判断の要約: [documents/README.md](documents/README.md)
- 詳細仕様: [program_docs/README.md](program_docs/README.md)

## Current Verification

- Backend unit tests: pass
- Frontend typecheck / GLTF fixture validation / production build: pass
- Frontend production dependency audit: 0 vulnerabilities
- Docker Compose frontend build and container startup: pass
