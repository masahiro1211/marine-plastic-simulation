# Development Workflow

## Docker

標準の実行方法は Docker Compose。

```bash
docker compose up --build
```

起動対象:

- frontend: `http://localhost:3000`
- backend: `http://localhost:8000`
- docs: `http://localhost:8000/docs`

## ローカル開発

### Backend

```bash
cd backend
source .venv/bin/activate
uvicorn app.main:app --reload
```

### Frontend

```bash
cd frontend
npm start
```

## テスト

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

## CI

CI では以下を最低限通す。

1. Backend unit tests
2. Frontend production build
3. Docker Compose build

## コミット方針

- schema 変更
- engine / api 変更
- frontend 変更
- tests / CI 変更

上記の単位でコミットを分ける。
