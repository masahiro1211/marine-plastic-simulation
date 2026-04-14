# API And DB Design

## 1. 方針

現時点のアプリはインメモリシミュレーションで動作しているが、将来的な分析、リプレイ、展示ログ保存に備えて API と DB 設計を先行定義する。

## 2. API 設計方針

- 設定更新は REST
- リアルタイム状態配信は WebSocket
- スナップショット形式は単一契約に統一
- ロボット種別が増えても `agent_type` と `metadata` で拡張する

## 3. 推奨 REST API

### `GET /api/config`

現在設定を取得する。

### `PUT /api/config`

設定を更新する。

#### Request 例

```json
{
  "width": 960,
  "height": 640,
  "steps": 600,
  "scout_count": 2,
  "collector_count": 3,
  "marine_life_count": 10,
  "trash_count": 20,
  "trash_weight": 1.0,
  "avoid_fish_weight": 1.2,
  "avoid_robot_weight": 0.8,
  "random_weight": 0.3
}
```

### `POST /api/simulation/start`

シミュレーションを開始する。

### `POST /api/simulation/stop`

シミュレーションを停止する。

### `POST /api/simulation/reset`

初期状態へ戻す。

### `GET /api/simulation/snapshot`

現時点の単発スナップショットを取得する。

### `GET /api/stats/history`

時系列統計を取得する。

## 4. WebSocket 設計

### `WS /ws/simulation`

毎 tick で snapshot を push する。

### Snapshot 例

```json
{
  "tick": 128,
  "phase": "running",
  "score": {
    "total": 124.0,
    "trash_collected": 18,
    "collisions": 2,
    "marine_life_stress": 14.5,
    "energy_remaining": 37.0
  },
  "stats": {
    "scouts": 2,
    "collectors": 3,
    "marine_life": 9,
    "trash_remaining": 12,
    "active_robots": 4
  },
  "agents": [
    {
      "id": "collector-1",
      "agent_type": "robot",
      "role": "collector",
      "x": 120.5,
      "y": 88.2,
      "vx": 1.0,
      "vy": 0.0,
      "alive": true,
      "energy": 8.0,
      "status": "moving",
      "target_id": "trash-3",
      "metadata": {
        "carrying": false,
        "sensor_radius": 30
      }
    }
  ],
  "events": [
    {
      "event_type": "trash_collected",
      "actor_id": "collector-1",
      "target_id": "trash-3",
      "tick": 128
    }
  ]
}
```

## 5. 共通エージェントスキーマ

### 必須

- `id`
- `agent_type`
- `role`
- `x`
- `y`
- `vx`
- `vy`
- `alive`
- `status`

### ロボットのみ必須

- `energy`
- `target_id`

### 拡張領域

- `metadata`

`metadata` により、ロボット固有の装備や表示情報を後方互換で追加できる。

## 6. イベントモデル

将来 DB 保存する単位として、状態全量ではなくイベント中心を推奨する。

### event_type 候補

- `robot_moved`
- `trash_detected`
- `trash_shared`
- `trash_collected`
- `collision_detected`
- `marine_life_avoided`
- `battery_depleted`
- `battery_recovered`
- `simulation_started`
- `simulation_finished`

## 7. DB 設計

現段階では未実装でもよいが、以下の論理テーブルを基準とする。

### `simulation_runs`

- `id`
- `started_at`
- `ended_at`
- `config_json`
- `final_score`
- `result_status`

### `simulation_ticks`

- `id`
- `run_id`
- `tick`
- `score_total`
- `trash_collected`
- `collision_count`
- `marine_life_stress`
- `energy_remaining`

### `agents`

- `id`
- `run_id`
- `agent_key`
- `agent_type`
- `role`
- `spawn_tick`
- `despawn_tick`

### `agent_events`

- `id`
- `run_id`
- `tick`
- `agent_id`
- `event_type`
- `payload_json`

## 8. API 安定化ルール

- 新規フィールドは削除ではなく追加で対応する
- enum 値は docs で管理する
- ロボット追加時も REST / WS のベース契約は変えない
- UI 側は `role` と `metadata` で描画分岐する

## 9. 実装優先度

1. snapshot 契約の固定
2. config 契約の固定
3. score / stats の整理
4. event モデル導入
5. DB 永続化
