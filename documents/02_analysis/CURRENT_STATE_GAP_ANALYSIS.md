# Current State Gap Analysis

## 1. 目的

本書は、現在のコードベースと目標仕様の差分を明示する。  
この差分を見ずに実装へ進むと、名前だけ置き換えて責務が壊れる可能性が高い。

## 2. 現在の実装

### Backend

- `SimulationConfig` は `scout / collector / marine_life / trash` と移動・エネルギー・群れ挙動・誤飲半径の設定を持つ
- `SimulationSnapshot` は `phase`, `base`, `stats`, `score`, `events` を含む
- engine は target 共有、trash 回収、battery、score、魚-ロボット接触カウントと魚の誤飲処理を持つ
- backend unit test は新契約に対して実装済み
- 主要 Python モジュールの docstring は Google 形式へ整備済み

### Frontend

- ControlPanel は主要 5 項目の設定変更に対応
- StatsPanel は phase、score、robot 数、energy を表示
- renderer は `scout / collector / marine_life / trash` を描画可能
- hook は REST bootstrap と WebSocket streaming を分離して扱う
- frontend lockfile は CI の `npm ci` に合わせて更新済み

## 3. 目標仕様との差分

現時点で、当初の大きな仕様差分はほぼ解消されている。  
残る差分は「未実装」よりも「今後の拡張余地」の整理である。

### 用語差分

- 旧用語ベースの補助コード (`fish.py`, `plastic.py`, `predator.py`) は残るが、主経路では使用していない

### 機能差分

- 高度な可視化や履歴チャート UI は未実装
- frontend で常時編集できるパラメータは 5 項目に絞っている
- docstring は backend を中心に整備済みで、frontend 側は JSDoc を段階的に追記中

### 契約差分

- backend / frontend の主要契約差分はなし
- 今後 schema を変える場合は CI と `program_docs/` の同時更新が必要

## 4. 実装リスク

- schema を変更して frontend 型を追随しないと UI が静かに壊れる
- lockfile を更新せずに package 追加や peer 解決が変わると CI が落ちる
- `documents/` を現在状態へ更新しないと、古い計画書が実装の妨げになる

## 5. 推奨対応

### 先行対応

- 変更前に `SimulationConfig` / `SimulationSnapshot` の影響範囲を確認する
- frontend 依存を変えた場合は `npm ci` と `npm run build` をセットで回す
- backend ロジック変更時は unit test と docstring を合わせて更新する

### 中盤対応

- 新しい UI 表現や履歴表示の追加
- ドメインイベントの可視化強化

### 後半対応

- 追加シナリオやパラメータ公開範囲の拡張
- 設計資料の整理と長期運用向けの文書統合

## 6. 今は実装しない方がよいこと

- DB 永続化の本実装
- ロボット種別を 3 つ以上追加すること
- パラメータを大量に増やすこと
- 演出だけ先に作ること
