# Develop 修正実装レポート 2026-05-13

## 対象

`ogawa` ブランチを最新 `origin/develop` に fast-forward した後、承認された項目を実装した。

手動操作ロボットの見た目改善は REJECT のため、今回の実装対象外。

## 実装内容

- frontend Docker は最新 develop 側の修正を取り込み、Node 22 / `npm ci --no-audit --no-fund` / 起動時 install 廃止の構成になった。
- frontend build/dev server を CRA `react-scripts` から Vite へ移行した。
- `origin/feature/3d-models-experiment` に残っていた `collector.glb`, `fish.glb`, `orca.glb` を復旧し、3D Canvas で collector / marine_life / predator に適用した。
- `can.glb` と `plastic_bottle.glb` は各 35MB 超で 3D view と Docker context を重くするため採用せず、trash は軽量な Three.js mesh で安定描画する。
- GLB model のロード失敗時に Canvas 全体が落ちないよう、3D model ごとに軽量 Three.js fallback mesh を持たせた。
- runtime GLTF manifest から `*.glftest.gltf` 参照を外し、dummy assets は `public/assets/gltf/fixtures` へ移動した。
- GLTF 検証スクリプトは runtime asset ではなく fixture asset を検証する名前付けに変更した。
- frontend の `DEFAULT_CONFIG` 重複を `DEFAULT_SIMULATION_CONFIG` に集約し、backend default と揃えた。
- WebSocket 接続時の暗黙 start をやめ、frontend が `start` action を明示送信する構成にした。
- frontend の disconnect は socket close 前に `stop` action を送信する。
- 2D Canvas は React state を毎 animation frame 更新する構成をやめ、Canvas draw loop 内で直接描画する構成にした。
- 3D Canvas の DPR 上限を `2` から `1.5` に下げた。
- GLTF runtime docs と development workflow を更新した。

## 残る課題

- scout の専用 3D model は対象ブランチにも見当たらないため、既存の procedural mesh を継続している。
- ローカルに古い `frontend/build` が `nobody:nogroup` 所有で残っていても、Vite は `dist` を出力するため通常 build には影響しない。

## 検証結果

- `npm run typecheck`: pass
- `npm run test:gltf-assets`: pass
- `npm run build`: pass
- `docker compose run --rm backend python -m unittest discover -s tests`: pass
- `docker compose build --no-cache frontend`: pass
- `docker compose up -d --force-recreate frontend backend`: pass
- backend container 内 `GET /api/simulation/snapshot`: pass
- frontend container 内 `GET http://0.0.0.0:3000`: pass
- frontend container 内 `GET /models/collector.glb`: pass
- frontend container 内 `GET /models/fish.glb`: pass
