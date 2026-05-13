# Security Hardening Report - 2026-05-13

## Scope

- 対象: FastAPI REST API、WebSocket `/ws/simulation`、React/Vite frontend、npm dependency tree
- 目的: 開発者による防御目的の脆弱性洗い出し、修正、検証結果の記録

## Findings And Fixes

### 1. Wildcard CORS With Credential Support

- リスク: `allow_origins=["*"]` と `allow_credentials=True` により、ブラウザ経由のクロスオリジン制御が過度に緩い状態だった。
- 攻撃者視点: 悪性ページからユーザーのブラウザを利用して API を呼び、シミュレーション状態を開始・停止・リセット・設定変更できる。
- 修正:
  - `ALLOWED_ORIGINS` による Origin allowlist を導入。
  - credentials を無効化。
  - 許可メソッドと許可ヘッダーを必要最小限に制限。
  - `TrustedHostMiddleware` と `ALLOWED_HOSTS` を導入。
- 変更ファイル:
  - `backend/app/main.py`
  - `backend/app/security.py`
  - `docker-compose.yml`

### 2. WebSocket Origin Validation Missing

- リスク: WebSocket は CORS の対象外で、Origin チェックがないと別 Origin のブラウザページから制御接続される。
- 攻撃者視点: 悪性サイトが `/ws/simulation` に接続し、`start`、`stop`、`reset`、`update_config`、`manual_move` を送信して状態を操作できる。
- 修正:
  - `Origin` ヘッダーを `ALLOWED_ORIGINS` で検証。
  - 不許可 Origin は WebSocket close code `1008` で拒否。
- 変更ファイル:
  - `backend/app/api/ws.py`
  - `backend/app/security.py`

### 3. Unbounded Simulation Config

- リスク: REST/WS から受け取る `SimulationConfig` に範囲制限がなく、極端な agent 数、tick 間隔、steps、半径、速度、NaN/Infinity を投入できた。
- 攻撃者視点: `collector_count=10000` や非常に短い tick、巨大な trash count などで CPU/メモリを消費させる。NaN/Infinity で計算結果を壊す。
- 修正:
  - Pydantic `Field` で各値に上限・下限を設定。
  - `allow_inf_nan=False` で非有限値を拒否。
  - `trash_cluster_min/max`、Lévy step min/max、energy threshold の整合性を検証。
- 変更ファイル:
  - `backend/app/models/schemas.py`
  - `backend/tests/test_security.py`

### 4. WebSocket Control Message Robustness

- リスク: `receive_json()` が不正 JSON や巨大メッセージを直接処理し、接続処理の例外やリソース消費につながる可能性があった。
- 攻撃者視点: 不正 JSON を連続送信して接続処理を不安定化させる。巨大 payload でメモリを消費させる。`manual_move` に非有限値や極端値を投入する。
- 修正:
  - control message を 8192 bytes に制限。
  - 不正 JSON と validation error は接続を落とさず無視。
  - `manual_move` の `dx/dy` を finite float に正規化し、`-1.0` から `1.0` に clamp。
- 変更ファイル:
  - `backend/app/api/ws.py`
  - `backend/tests/test_security.py`

### 5. Dev Reload In Container Image

- リスク: backend Docker image が `uvicorn --reload` を既定起動していた。開発用途では便利だが、ファイル監視や reload process は本番相当の起動として不要。
- 攻撃者視点: 直接の remote exploit ではないが、運用時の攻撃面と予測不能な再起動要因を増やす。
- 修正:
  - Dockerfile の既定 CMD から `--reload` を削除。
- 変更ファイル:
  - `backend/Dockerfile`

## npm Vulnerability Review

実行日: 2026-05-13

### `npm audit --json`

- 結果: 脆弱性 0 件
- 内訳: info 0 / low 0 / moderate 0 / high 0 / critical 0
- dependency count: total 194

### Updated Packages

以下を registry の最新互換版へ更新し、lockfile も更新した。

- `react`: `^19.2.6`
- `react-dom`: `^19.2.6`
- `@types/node`: `^25.7.0`
- `@types/three`: `^0.184.1`
- `autoprefixer`: `^10.5.0`
- `typescript`: `^6.0.3`
- `yaml`: `^2.9.0`

### Remaining `npm outdated`

- `tailwindcss`: current `3.4.19`, latest `4.3.0`

Tailwind 4 は major migration で設定と CSS 処理の見直しが必要になる。今回の audit では Tailwind 3.4.19 に脆弱性は出ていないため、セキュリティ修正としての緊急更新対象からは除外した。

## Verification

- Backend: `./.venv/bin/python -m unittest discover -s tests -v` -> 25 tests passed
- Frontend: `npm run typecheck` -> passed
- Frontend: `npm run test:gltf-assets` -> passed
- Frontend: `npm run build` -> passed
- npm: `npm audit --json` -> 0 vulnerabilities

## Operational Notes

- 公開環境では `ALLOWED_ORIGINS` を実際の frontend Origin のみに設定する。
- reverse proxy 配下では `ALLOWED_HOSTS` に公開 host と内部 service host を明示する。
- 今後 config 項目を追加する場合は、必ず Pydantic の上限・下限と整合性検証を同時に追加する。
