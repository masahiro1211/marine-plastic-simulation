# Implementation Task Breakdown

## 1. 目的

4 本の主文書に分散している実装タスクを、実行可能な粒度で束ね直す。

## 2. Epic A: 契約固定

### 目的

backend と frontend が同じ構造を前提にできるようにする。

### タスク

- `SimulationConfig` の新仕様定義
- `SimulationSnapshot` の新仕様定義
- `AgentState` の共通項目定義
- `Stats` と `Score` の責務分離
- `event_type` の最小セット定義

### 参照文書

- `documents/01_source_of_truth/IMPLEMENTATION_SOURCE_OF_TRUTH.md`
- `documents/03_readiness/IMPLEMENTATION_READINESS_CHECKLIST.md`
- `documents/05_reference/API_CONTRACT_BASELINE.md`

## 3. Epic B: バックエンド構造改修

### 目的

既存の生態系シミュレーションを、役割分担型ロボットシミュレーションへ寄せる。

### タスク

- `fish / predator / plastic` 前提の config を置換
- engine に `phase`, `score`, `events` を導入
- `scout / collector / marine_life / trash` の責務分離
- 共有ターゲットの導入
- ストレス更新ロジックの導入
- バッテリー停止と回復条件の導入

### 参照文書

- `documents/02_analysis/CURRENT_STATE_GAP_ANALYSIS.md`
- `documents/05_reference/DOMAIN_MODEL.md`
- `documents/04_delivery/DELIVERY_MILESTONES.md`

## 4. Epic C: フロントエンド整合

### 目的

新しい backend 契約を UI 上で扱えるようにする。

### タスク

- ControlPanel を新 config に追従
- StatsPanel を score / stats 表示へ更新
- renderer registry を新 role 名へ追従
- 画面文言を fish / predator / plastic から移行

### 参照文書

- `documents/01_source_of_truth/IMPLEMENTATION_SOURCE_OF_TRUTH.md`
- `documents/04_delivery/DELIVERY_MILESTONES.md`
- `documents/05_reference/API_CONTRACT_BASELINE.md`

## 5. Epic D: チーム拡張対応

### 目的

後続メンバーが安全にデザインや挙動を拡張できる状態にする。

### タスク

- `metadata` の運用ルールを定義
- renderer 差し替えポイントを明示
- agent component 単位の拡張方針を定義
- 未解決仕様を `OPEN_QUESTIONS` で管理

### 参照文書

- `documents/04_delivery/DELIVERY_MILESTONES.md`
- `documents/05_reference/DOMAIN_MODEL.md`
- `documents/06_open_questions/OPEN_QUESTIONS.md`

## 6. 実装順の推奨

1. Epic A
2. Epic B
3. Epic C
4. Epic D

## 7. 今すぐ着手してよい最小単位

- schema のドラフト更新
- score / stats / event の型定義
- config 名称移行案の作成

これら以外は、`OPEN_QUESTIONS` の解消状況を見て進める。
