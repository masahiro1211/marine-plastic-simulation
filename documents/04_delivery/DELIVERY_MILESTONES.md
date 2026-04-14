# Delivery Milestones

## Milestone 1: Schema First

### 目的

backend と frontend が同じ契約を見る状態を作る。

### 完了条件

- `SimulationConfig` が新仕様へ更新されている
- `SimulationSnapshot` に `phase`, `score`, `events` がある
- `AgentState` に `role`, `vx`, `vy`, `status`, `metadata` がある
- 既存 API が壊れず最低限起動する

### 状態

- 完了

## Milestone 2: Engine Refactor

### 目的

新しいゲームループを backend に載せる。

### 完了条件

- scout と collector の責務が分離されている
- marine life の stress 更新がある
- trash 回収数が取れる
- score が毎 tick 更新される

### 状態

- 完了

## Milestone 3: Frontend Alignment

### 目的

画面表示を新仕様へ合わせる。

### 完了条件

- ControlPanel が新 config を編集できる
- StatsPanel が score と新 stats を表示できる
- renderer が新 role 名に対応している

### 状態

- 完了

## Milestone 4: Team Extension Ready

### 目的

後続メンバーが安全に改造できる状態へ持っていく。

### 完了条件

- renderer の差し替え点が明確
- agent ごとの追加項目が `metadata` に整理されている
- コンポーネント追加箇所がドキュメント化されている
- 追加仕様が既存契約を壊さない

### 状態

- 進行中
- backend の Google docstring 整備は完了
- frontend の JSDoc 整備と documents 更新を継続中
- 今後は拡張ポイントの明文化を増やす
