# Implementation Source Of Truth

## 1. この文書の目的

本プロジェクトは、企画文書は存在するが、実装者がそのままコード変更に入るには解釈の余地が多い。  
そのため、本書を「実装着手の単一参照点」とし、以後の判断基準を固定する。

## 2. 現時点の結論

現在のコードは、目標仕様である  
`scout / collector / marine_life / trash` の役割分担型ロボットシミュレーションへ移行済みである。

現在の実装前提は次のとおり。

- backend は FastAPI + WebSocket でシミュレーション実行と snapshot 配信を担う
- frontend は React + TypeScript + Canvas で設定変更と描画を担う
- `SimulationConfig` / `SimulationSnapshot` / `AgentState` は backend と frontend で共有前提の契約とする
- score、events、phase、base 情報は snapshot に含める
- CI では backend test、frontend build、Docker build を最低限の品質ゲートとする

## 3. 実装対象の正式定義

### ステージ

- 2D 環境
- `width`, `height`, `steps`, `tick_interval_ms` を持つ
- ごみ、ロボット、海洋生物を保持する

### エージェント

- `scout`: ごみ探索と共有
- `collector`: ごみ回収
- `marine_life`: 回避、ロボット接触カウント、ゴミ誤飲カウント
- `trash`: 漂流または静的オブジェクト

### コアゲームループ

1. 観測
2. 共有
3. 行動決定
4. 移動
5. 回収判定
6. 魚とロボットの接触カウント、魚のゴミ誤飲処理
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
- `backend/app/api/*`: 再利用しつつ新契約に更新済み
- `backend/app/simulation/engine.py`: 新ループへ改修済み
- `backend/app/simulation/agents/base.py`: 共通基底として再利用
- `frontend/src/renderers/*`: registry 構造を維持したまま新 agent 種別へ対応済み
- `frontend/src/components/ControlPanel.tsx`: 主要パラメータ編集 UI として更新済み
- `frontend/src/components/StatsPanel.tsx`: score と新 stats 表示へ更新済み
- `frontend/src/hooks/useSimulation.ts`: REST + WebSocket の橋渡しとして整理済み

## 6. 現在の品質基準

以後の変更では、以下を維持する。

- Config 契約を backend / frontend で崩さない
- Snapshot 契約の後方互換を不用意に壊さない
- `scout` と `collector` の責務を再び混在させない
- `marine_life` は消滅させず、ロボット接触数と誤飲ゴミ数を backend stats で計上する
- CI の backend test、frontend build、Docker build を通す

## 7. 今後の変更順

1. schema 変更の必要性確認
2. backend engine / API 変更
3. frontend 契約追随
4. テストと CI の確認
5. `documents/` と `program_docs/` の更新

## 8. 優先しないもの

- 先行して DB 実装までやること
- 高度な UI 演出
- 本格的なアニメーション強化
- ロボット種別の追加量産

## 9. 判断に迷ったとき

- 実装可否: `documents/03_readiness/IMPLEMENTATION_READINESS_CHECKLIST.md`
- 何がズレているか: `documents/02_analysis/CURRENT_STATE_GAP_ANALYSIS.md`
- 何を受け入れ条件にするか: `documents/04_delivery/DELIVERY_MILESTONES.md`
