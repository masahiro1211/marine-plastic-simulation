# Marine Cleanup Robot Simulation

海洋ごみ回収ロボットと海洋生物の相互作用を可視化するリアルタイムシミュレーションです。  
Scout がごみを見つけ、Collector が回収して基地へ搬入し、Marine Life はロボット接近に応じて stress を蓄積します。

## Stack

| Layer | Tech |
|---|---|
| Backend | Python 3.12 / FastAPI / WebSocket |
| Frontend | React 19 / Tailwind CSS / Canvas API |
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
npm start
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
- Frontend production build: pass
- Dockerfiles: added `.dockerignore` and kept Docker-first execution path

この実行環境では Docker daemon / Compose plugin 制約により実ビルド確認までは行えていません。  
その代わり、CI に Docker Compose build を追加しています。
