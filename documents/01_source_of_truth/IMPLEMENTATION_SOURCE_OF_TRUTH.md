# Implementation Source Of Truth

## 1. この文書の目的

本プロジェクトは、企画文書は存在するが、実装者がそのままコード変更に入るには解釈の余地が多い。  
そのため、本書を「実装着手の単一参照点」とし、以後の判断基準を固定する。

## 2. 現時点の結論

現状のコードは「fish / predator / plastic の生態系シミュレーション」であり、  
目標仕様である「scout / collector / marine_life / trash の役割分担型ロボットシミュレーション」とは一致していない。

したがって、次の前提で実装を進める。

- 既存コードは全面破棄しない
- 既存の描画、WebSocket、FastAPI の土台は再利用する
- ドメイン用語を新仕様へ寄せる
- API 契約を先に安定化させる
- UI 改修は backend の契約固定後に行う

## 3. 実装対象の正式定義

### ステージ

- 2D 環境
- `width`, `height`, `steps`, `tick_interval_ms` を持つ
- ごみ、ロボット、海洋生物を保持する

### エージェント

- `scout`: ごみ探索と共有
- `collector`: ごみ回収
- `marine_life`: 回避とストレス蓄積
- `trash`: 漂流または静的オブジェクト

### コアゲームループ

1. 観測
2. 共有
3. 行動決定
4. 移動
5. 回収判定
6. ストレス更新
7. スコア更新
8. スナップショット配信

## 4. 先に固定すべき契約

実装順序の観点から、以下は最優先で固定する。

### Config 契約

- ステージサイズ
- ステップ数
- scout / collector / marine_life / trash の個数
- 速度関連
- ベクトル重み
- センサー半径
- バッテリー関連

### Snapshot 契約

- `tick`
- `phase`
- `agents`
- `stats`
- `score`
- `events`

### Agent 共通契約

- `id`
- `agent_type`
- `role`
- `x`, `y`
- `vx`, `vy`
- `alive`
- `status`
- `metadata`

### Robot 追加契約

- `energy`
- `target_id`

## 5. 既存コードの再利用方針

- `backend/app/main.py`: 再利用
- `backend/app/api/*`: 再利用しつつ契約更新
- `backend/app/simulation/engine.py`: 大幅改修
- `backend/app/simulation/agents/base.py`: 再利用
- `backend/app/simulation/agents/fish.py`: `marine_life` のベースへ転用可
- `backend/app/simulation/agents/plastic.py`: `trash` のベースへ転用可
- `backend/app/simulation/agents/predator.py`: 直接流用は避け、`collector` として再設計推奨
- `frontend/src/renderers/*`: registry 構造は維持
- `frontend/src/components/ControlPanel.js`: ラベルと入力項目を全面更新
- `frontend/src/components/StatsPanel.js`: 表示項目を全面更新

## 6. 実装開始条件

以下が揃うまでは大きなコード実装に入らない。

- 新しい Config 契約が確定している
- 新しい Snapshot 契約が確定している
- スコア式が固定している
- `marine_life` のストレス仕様が固定している
- `scout` と `collector` の責務境界が文章で定義されている

## 7. 実装順

1. schema 更新
2. engine 更新
3. agent 役割分離
4. API 更新
5. frontend 更新
6. パラメータ調整
7. スライド・説明文言の更新

## 8. 優先しないもの

- 先行して DB 実装までやること
- 高度な UI 演出
- 本格的なアニメーション強化
- ロボット種別の追加量産

## 9. 判断に迷ったとき

- 実装可否: `documents/03_readiness/IMPLEMENTATION_READINESS_CHECKLIST.md`
- 何がズレているか: `documents/02_analysis/CURRENT_STATE_GAP_ANALYSIS.md`
- 何を受け入れ条件にするか: `documents/04_delivery/DELIVERY_MILESTONES.md`
