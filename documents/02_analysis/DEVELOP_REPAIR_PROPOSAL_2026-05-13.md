# Develop 修正提案 2026-05-13

## 目的

develop 系に入っている現状の問題を、実装修正に入る前に洗い出し、承認対象の修正方針としてまとめる。

この文書ではまだコード修正は行わない。承認後に、優先順位の高いものから `ogawa` ブランチ上で実装する。

## 確認したこと

- `docker compose build --no-cache frontend` は失敗しないが、npm 警告が大量に出る。
- `docker compose up -d` の frontend は `command: sh -c "npm ci && npm start"` により、起動のたびに 1354 packages を再インストールする。
- frontend の no-cache install では `camera-controls@3.1.2` が Node `>=22.0.0` を要求するが、Dockerfile は `node:20-alpine` を使っている。
- frontend install では deprecated dependency 警告が多数、audit は 29 vulnerabilities を報告する。
- `npm run typecheck` は通る。
- `npm run test:gltf-assets` は通るが、対象は `*.glftest.gltf` の dummy assets。
- `npm run build` はローカルでは `frontend/build` が `nobody:nogroup` 所有のため `EACCES` で落ちる。
- backend は Docker 内で `python -m unittest discover -s tests` が 19 件通る。
- backend には `pytest` が入っていないため、`python -m pytest` はローカル/Docker どちらでもそのままでは失敗する。

## 修正すべき項目

### P0: frontend Docker 起動と npm 警告の整理

現状:

- [../../frontend/Dockerfile](../../frontend/Dockerfile) は `RUN npm install`。
- [../../docker-compose.yml](../../docker-compose.yml) はコンテナ起動ごとに `npm ci && npm start`。
- `@react-three/drei@10.7.7` 経由の `camera-controls@3.1.2` が Node 22 以上を要求する一方、Dockerfile は Node 20。

提案:

- Dockerfile を Node 22 系へ更新する。
- install は `npm ci` に寄せ、lockfile 再現性を上げる。
- compose の起動時 `npm ci` を原則やめる。依存更新は build 時に閉じる。
- 開発用 volume 構成は残す場合でも、依存インストールを毎起動しない構成にする。

期待効果:

- 起動時間の大幅短縮。
- EBADENGINE 警告の解消。
- Docker build と runtime の依存状態が一致する。

### P0: 実 3D アセット喪失と dummy GLTF の扱いを整理

現状:

- [../../frontend/src/assets/assetManifest.ts](../../frontend/src/assets/assetManifest.ts) は `scout.glftest.gltf` など dummy assets を参照している。
- [../../frontend/scripts/validate-gltf-assets.js](../../frontend/scripts/validate-gltf-assets.js) も dummy assets を検証しており、成功メッセージも `GLTF dummy assets`。
- 実在する 3D らしい asset は [../../frontend/public/models/orca.glb](../../frontend/public/models/orca.glb) のみ。
- 3D 画面は `Canvas3D.tsx` 内の手書き geometry と orca model の混在で、asset manifest の GLTF assets とは別系統になっている。

提案:

- まず必要な asset 一覧を確定する: scout, collector, marine_life, trash, predator, base/stage。
- dummy asset は fixture/test 用ディレクトリへ移すか、ファイル名を fixture として明確化する。
- runtime manifest は実 asset を参照する。
- asset 検証スクリプトは「fixture 検証」と「runtime asset 検証」を分離する。
- 実 asset が未準備のものは、承認を得た fallback 方針を決める。

期待効果:

- 「検証は通るが実 asset はない」状態を解消できる。
- 2D/3D の asset 管理が一本化される。

### P0: 重さの原因を潰す

現状:

- frontend 起動時に毎回 `npm ci` するため、起動だけで重い。
- `react-scripts start` が fork-ts-checker を複数起動し、CRA 開発サーバのオーバーヘッドが大きい。
- 3D 側は agent ごとに mesh を個別生成し、`dpr={[1, 2]}` で高 DPI 描画を許す。
- 2D 側は `requestAnimationFrame` で常時 state 更新し、simulation tick とは別に毎フレーム再描画している。

提案:

- Docker 起動時 npm install を廃止する。
- 3D は表示数が増える agent から instancing / lightweight mesh reuse を検討する。
- 3D の DPR 上限を設定で落とせるようにする。
- 2D の常時 `setFrameTime` は必要な animation 時だけに限定する、または ref ベースに変更する。
- performance budget を docs/test に追加する。

期待効果:

- 起動時間、CPU 使用率、描画負荷をそれぞれ別に下げられる。

### P1: 手動操作ロボットの見た目と識別性

現状:

- 3D collector は単なる緑の box。
- manual collector と通常 collector の見た目が区別されない。
- 2D 側も collector の carrying indicator はあるが manual mode の主役感が弱い。

提案:

- `metadata` または既存 `is_manual` 状態を frontend state に出すか、manual collector の ID/role を判定可能にする。
- manual robot 専用の 2D/3D 表現を作る: 操作中 indicator、向き、ライト、アーム/回収機構。
- 通常 collector と色・形・サイズ・エフェクトを分ける。
- 操作入力中、衝突ペナルティ中、carry 中の状態を見た目に反映する。

期待効果:

- 操作対象が即座に分かる。
- 「箱が動いている」印象を避けられる。

承認結果:

- 2026-05-13 時点でこの項目のみ REJECT。今回の実装スコープから除外する。

### P1: frontend/backend config の二重定義と不一致

現状:

- `DEFAULT_CONFIG` が [../../frontend/src/hooks/useSimulation.ts](../../frontend/src/hooks/useSimulation.ts) と [../../frontend/src/components/ControlPanel.tsx](../../frontend/src/components/ControlPanel.tsx) に重複している。
- backend の [../../backend/app/models/schemas.py](../../backend/app/models/schemas.py) と frontend の [../../frontend/src/types.ts](../../frontend/src/types.ts) の config 定義は手動同期。
- 一部 default が backend と frontend で異なる。例: `avoid_robot_weight`, `marine_life_avoid_radius`。

提案:

- frontend の default config は単一ファイルへ集約する。
- 可能なら backend `/api/config` の値を初期表示の source of truth にする。
- schema/type の同期方針を決める。最低限、default 差分を検出するテストを追加する。

期待効果:

- UI で見えている設定と実 runtime の設定がずれるリスクを減らす。

### P1: WebSocket lifecycle と stop 動作

現状:

- WebSocket 接続直後に backend が `engine.start()` する。
- frontend の停止ボタンは `onDisconnect` で socket を閉じるだけで、明示的な `stop` action を送らない。
- backend は `WebSocketDisconnect` で `engine.stop()` するため、切断が stop と同義になっている。

提案:

- Start/Stop/Disconnect の意味を分ける。
- 停止ボタンは `stop` action を送ってから接続を閉じる、または接続維持のまま stopped phase を表示する。
- 接続しただけで開始する仕様を維持するか、明示 start にするかを決める。

期待効果:

- UI 操作と engine phase の対応が分かりやすくなる。

### P1: build artifact の所有者問題

現状:

- `frontend/build` が `nobody:nogroup` 所有で、ローカル `npm run build` が `EACCES` で失敗する。

提案:

- build output は git 管理外にし、Docker/ローカルで root-owned artifact を残さない。
- 必要なら compose/Dockerfile の user 設定を見直す。
- `.dockerignore` / `.gitignore` の build, node_modules, cache 除外を再確認する。

期待効果:

- ローカル build と Docker build の相互汚染を防ぐ。

### P2: test command と依存の整理

現状:

- backend tests は unittest で書かれている。
- `pytest` は requirements にない。
- 調査時に `python -m pytest` は失敗するが、`python -m unittest discover -s tests` は成功する。

提案:

- README/CONTRIBUTING の test command を現状に合わせる。
- pytest に寄せるなら requirements-dev を追加して明示する。
- Docker 内で実行する標準 test command を docs に書く。

期待効果:

- テスト失敗と環境不足の切り分けがしやすくなる。

### P2: React/CRA 依存の古さと脆弱性

現状:

- `react-scripts@5.0.1` 起因の deprecated dependency が多い。
- npm install は 29 vulnerabilities を報告している。
- React 19 と CRA 5 の組み合わせは今後の保守性が悪い。

提案:

- 短期: Node 22 + lockfile 再生成 + `npm audit` 結果の精査。
- 中期: Vite 移行を検討する。
- 破壊的更新が必要な vulnerability は、機能修正とは別タスクに分ける。

期待効果:

- warning noise を減らし、実エラーが見やすくなる。
- 開発サーバと build を軽くできる。

## 推奨実装順

1. Docker/frontend 起動の修正: Node 22, `npm ci`, 起動時 install 廃止。
2. build artifact / ignore / user の整理。
3. runtime asset manifest と dummy fixture の分離。
4. 手動操作ロボットの見た目と状態表現。
5. 3D/2D rendering performance 改善。
6. config default の単一化と backend/frontend 差分検出。
7. WebSocket lifecycle の意味整理。
8. test command/docs と dependency audit の整理。

## 承認してほしい判断

- Docker frontend は Node 22 へ上げてよいか。
- 起動時 `npm ci` は廃止してよいか。
- dummy GLTF は runtime から外し、fixture/test 用に降格してよいか。
- 実 3D asset がない agent は、暫定的に手書き Three.js mesh を改善する方針でよいか。
- CRA 継続で短期修正するか、Vite 移行も今回スコープに含めるか。
- manual robot の見た目は「専用 asset を待つ」か「まず procedural mesh で改善する」か。

## 検証方針

承認後の実装では最低限、以下を確認する。

- `docker compose build --no-cache frontend`
- `docker compose up -d`
- frontend 起動ログに EBADENGINE が出ないこと
- `npm run typecheck`
- `npm run build`
- `npm run test:gltf-assets` または新しい asset validation command
- `docker compose run --rm backend python -m unittest discover -s tests`
- ブラウザで 2D/3D 表示、manual robot 操作、start/stop/reset を確認
