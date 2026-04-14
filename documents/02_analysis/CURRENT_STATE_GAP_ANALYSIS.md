# Current State Gap Analysis

## 1. 目的

本書は、現在のコードベースと目標仕様の差分を明示する。  
この差分を見ずに実装へ進むと、名前だけ置き換えて責務が壊れる可能性が高い。

## 2. 現在の実装

### Backend

- `SimulationConfig` は `num_fish`, `num_predators`, `num_plastics` 前提
- `AgentState` は `angle`, `energy`, `alive` のみで role を持たない
- `StatsEntry` は `fish`, `predators`, `plastics` を数える
- `SimulationSnapshot` は `tick`, `agents`, `stats` のみ
- engine はスコア、イベント、共有メッセージ、phase を持たない

### Frontend

- ControlPanel は fish / predator / plastic 向けの設定のみ表示
- StatsPanel は fish / predator / plastic の数だけを表示
- 描画は既存エージェント種別前提

## 3. 目標仕様との差分

### 用語差分

- `fish` -> `marine_life`
- `predator` -> `collector` ではない
- `plastic` -> `trash`

### 機能差分

- scout の探索と共有がない
- collector の回収責務がない
- marine_life のストレスモデルが弱い
- score がない
- event がない
- robot role がない
- battery の停止 / 回復仕様が弱い

### 契約差分

- snapshot に `score`, `events`, `phase` がない
- agent schema に `role`, `vx`, `vy`, `status`, `target_id`, `metadata` がない
- config にロボット役割と重み設定がない

## 4. 実装リスク

- `predator` をそのまま `collector` に名前変更すると責務が壊れる
- frontend を先に変更すると backend 契約未確定で手戻りが増える
- score を後付けにすると engine の更新順序が複雑化する
- 共通 schema を先に作らないと、後続メンバーが別々の解釈で改修する

## 5. 推奨対応

### 先行対応

- schema 拡張
- config 名称変更
- stats / score 分離
- agent role 導入

### 中盤対応

- scout / collector のロジック分離
- message / target 共有導入
- marine_life stress 導入

### 後半対応

- UI ラベル変更
- renderer 差し替え
- 演出強化

## 6. 今は実装しない方がよいこと

- DB 永続化の本実装
- ロボット種別を 3 つ以上追加すること
- パラメータを大量に増やすこと
- 演出だけ先に作ること
