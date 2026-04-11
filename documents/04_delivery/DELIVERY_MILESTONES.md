# Delivery Milestones

## Milestone 1: Schema First

### 目的

backend と frontend が同じ契約を見る状態を作る。

### 完了条件

- `SimulationConfig` が新仕様へ更新されている
- `SimulationSnapshot` に `phase`, `score`, `events` がある
- `AgentState` に `role`, `vx`, `vy`, `status`, `metadata` がある
- 既存 API が壊れず最低限起動する

## Milestone 2: Engine Refactor

### 目的

新しいゲームループを backend に載せる。

### 完了条件

- scout と collector の責務が分離されている
- marine life の stress 更新がある
- trash 回収数が取れる
- score が毎 tick 更新される

## Milestone 3: Frontend Alignment

### 目的

画面表示を新仕様へ合わせる。

### 完了条件

- ControlPanel が新 config を編集できる
- StatsPanel が score と新 stats を表示できる
- renderer が新 role 名に対応している

## Milestone 4: Team Extension Ready

### 目的

後続メンバーが安全に改造できる状態へ持っていく。

### 完了条件

- renderer の差し替え点が明確
- agent ごとの追加項目が `metadata` に整理されている
- コンポーネント追加箇所がドキュメント化されている
- 追加仕様が既存契約を壊さない
