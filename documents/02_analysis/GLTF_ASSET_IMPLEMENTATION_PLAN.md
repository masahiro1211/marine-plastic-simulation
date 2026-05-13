# GLTF Asset Implementation Plan

## 1. 目的

エージェントとステージ要素を GLTF ベースのアセットとして扱えるようにし、実 GLTF 制作前でもダミー GLTF で読み込み、描画、アニメーション扱い、軽量化検証を通せる状態にする。

## 2. 成功条件

- 各 agent type が GLTF マニフェストからアセットを解決できる。
- GLTF が未取得または壊れている場合でも、既存 Canvas renderer へフォールバックできる。
- ダミー GLTF に animation clip 情報を持たせ、描画側が clip 名を前提に簡易アニメーションを適用できる。
- ステージ要素は画像と GLTF の両方を扱える。
- GLTF ファイルサイズ、node 数、primitive 数を検証する軽量化ゲートを持つ。
- カメラはパン、ズーム、リセット操作に対応する。
- 実装内容、運用仕様、検証結果を文書化する。

## 3. 実装方針

現時点では `three` 等の追加 3D runtime に依存せず、GLTF 2.0 JSON の `extras.mps` に軽量 2D 描画プリミティブを持たせる。これにより、実 GLTF が未完成でも Canvas 上で同じロード経路を確認できる。

将来、本番 GLTF をバイナリ mesh として扱う場合は、`frontend/src/assets/gltfAssetLoader.ts` と `frontend/src/renderers/gltfRenderer.ts` を Three.js / WebGL 実装へ差し替える。呼び出し元の Canvas と agent manifest の境界は維持する。

## 4. 追加する主な成果物

- `frontend/src/assets/assetManifest.ts`: agent / stage のアセット対応表。
- `frontend/src/assets/gltfAssetLoader.ts`: GLTF fetch、cache、軽量化 budget 検証。
- `frontend/src/renderers/gltfRenderer.ts`: `extras.mps.primitives` の Canvas 描画と clip ベースの簡易アニメーション。
- `frontend/public/assets/gltf/*.glftest.gltf`: scout / collector / marine_life / trash / base-platform のダミー GLTF。
- `frontend/public/assets/images/ocean-stage.svg`: ステージ画像アセット。
- `frontend/scripts/validate-gltf-assets.js`: ダミー GLTF と budget の検証スクリプト。

## 5. 軽量化ルール

初期 budget はダミー GLTF ごとに以下とする。

- 最大 4096 bytes
- 最大 8 nodes
- 最大 8 lightweight primitives

ステージ画像は 8192 bytes 以下を検証対象にする。実アセット導入時は、同じ検証スクリプトに texture サイズ、圧縮形式、未使用 node 除去の確認を追加する。

## 6. 検証計画

- `npm run test:gltf-assets`: ダミー GLTF の構造、animation clip、budget を検証する。
- `npm run typecheck`: TypeScript の型整合性を検証する。
- `BUILD_PATH=/tmp/mps-frontend-build npm run build`: 既存 `frontend/build` の権限問題を避けて本番ビルドを検証する。
- `PYTHONPATH=backend python3 -m unittest backend.tests.test_engine`: backend 契約に影響がないことを確認する。現環境では Python 依存未導入のため、`pip` 利用可能な環境で再実行する。
