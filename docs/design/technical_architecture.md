# Technical Architecture

## 1. 目的

本書は、展示向けロボットシミュレーションを実装する際の技術構成と、拡張しやすい責務分離を定義する。

## 2. 現行構成

- Backend: FastAPI / WebSocket / simulation engine
- Frontend: React / Canvas renderer / control panel / stats panel
- Infra: Docker Compose またはローカル起動

この構成自体は維持しつつ、ドメインを「魚と捕食者」から「ロボットと海洋生物」へ寄せる。

## 3. 目標アーキテクチャ

### 3.1 レイヤー

#### Presentation

- Canvas 上のリアルタイム描画
- パラメータ設定 UI
- 統計・スコア表示

#### Application

- シミュレーション開始、停止、リセット
- 構成パラメータ反映
- スナップショット配信

#### Domain

- Environment
- Robot agents
- Marine life agents
- Trash objects
- Score calculator
- Shared observation / command message

#### Infrastructure

- FastAPI endpoint
- WebSocket streaming
- 将来の DB adapter

## 4. 推奨ディレクトリ責務

### backend/app/models

- API request / response schema
- Snapshot schema
- Config schema
- Event schema

### backend/app/simulation

- `engine.py`: ターン進行、状態更新、スコア集約
- `environment.py`: ステージ、占有判定、境界処理
- `messages.py`: ロボット間共有情報
- `scoring.py`: スコア計算

### backend/app/simulation/agents

- `base.py`: 全エージェント共通の位置、速度、状態
- `scout.py`: 探索と共有
- `collector.py`: 回収と経路追従
- `marine_life.py`: 回避とストレス更新
- `trash.py`: 漂流または固定ごみ

### frontend/src/components

- `Canvas`: 描画責務のみ
- `ControlPanel`: パラメータ入力
- `StatsPanel`: スコア、個体数、バッテリーなどの表示

### frontend/src/renderers

- ロボット種別ごとの描画定義
- 後続メンバーが視覚差分だけを安全に編集できる層

## 5. 共通 I/O 設計原則

後続メンバーの作業を容易にするため、全ロボットで最低限の共通フィールドを持つ。

### 共通出力項目

- `id`
- `agent_type`
- `role`
- `x`, `y`
- `vx`, `vy`
- `alive`
- `energy`
- `status`
- `target_id`
- `metadata`

### 共通入力項目

- 周辺観測結果
- 共有メッセージ一覧
- 環境サイズ
- 重みパラメータ
- 現在ターン

## 6. コンポーネント拡張方針

ロボット固有機能は継承だけで増やさず、可能な限りコンポーネントとして差し替える。

### 想定コンポーネント

- Sensor component
- Movement policy
- Avoidance policy
- Task policy
- Battery policy
- Communication policy
- Animation hint

これにより、各メンバーは以下の範囲だけを触ればよい。

- デザイン担当: renderer / animation hint
- 挙動調整担当: movement / avoidance / task parameter
- 機能追加担当: sensor / communication / battery policy

## 7. データフロー

1. UI が設定値を送信
2. Backend が config を反映して simulation engine を再初期化
3. Engine が毎 tick で観測、共有、行動決定、移動、回収、ストレス更新、スコア計算を実行
4. Snapshot を WebSocket で配信
5. Frontend が Canvas と StatsPanel に反映

## 8. 既存実装からの移行指針

- `fish` は `marine_life` の土台として再利用可能
- `plastic` は `trash` として再整理できる
- `predator` は削除または `collector` の移動ロジックに置換する
- registry ベースの renderer 構造はそのまま活かす
- `useSimulation` の WebSocket / REST 分離も維持する

## 9. 非機能要件

- 低スペック PC でも滑らかに動く
- ロボット種別が増えても描画・更新が破綻しない
- 設定変更から再実行までが速い
- API 形式が安定し、後続実装者が壊しにくい
