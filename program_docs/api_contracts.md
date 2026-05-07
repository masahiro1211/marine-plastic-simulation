# API Contracts

## Config

Config は simulation のサイズ、個体数、速度、重み、センサー、バッテリー関連を定義する。

主な項目:

- `width`, `height`, `steps`, `tick_interval_ms`
- `scout_count`, `collector_count`, `marine_life_count`, `initial_trash_count`
- `scout_speed`, `collector_speed`, `marine_life_speed`, `trash_drift_speed`
- `trash_weight`, `avoid_marine_life_weight`, `avoid_robot_weight`, `random_weight`
- `scout_sensor_radius`, `collector_sensor_radius`, `collector_pickup_radius`
- `collision_radius`, `max_energy`, `energy_drain_per_tick`, `energy_charge_per_tick`
- `return_speed_factor`, `trash_spawn_interval`, `max_trash`
- `marine_life_avoid_radius`, `fish_eat_radius`
- `flock_zor_radius`, `flock_zoo_radius`, `flock_zoa_radius`
- `flock_alignment_weight`, `flock_cohesion_weight`, `flock_max_turn_rate`, `flock_noise`
- `sharing_mode`
- `enable_manual_robot`, `manual_penalty_ticks`
- `scout_search_duration`, `scout_levy_min_steps`, `scout_levy_max_steps`, `scout_levy_mu`
- `scout_battery_enabled`

## Snapshot

Snapshot は frontend が描画に使う単一契約で、以下を含む。

- `tick`
- `phase`
- `config`
- `base`
- `agents`
- `stats`
- `score`
- `events`

## Agent State

共通項目:

- `id`
- `agent_type`
- `role`
- `x`, `y`
- `vx`, `vy`
- `alive`
- `status` (値の例:`patrolling`, `collecting`, `delivering`, `charging`, `returning`, `returning_low_power`, `manual`, `slowed_down`)
- `energy`
- `target_id`
- `metadata`

## Stats

- `scouts`
- `collectors`
- `marine_life`
- `trash_remaining`
- `active_robots`
- `delivered_trash`
- `robot_fish_contacts`
- `fish_ate_trash`

## Score

- `total`
- `trash_delivered`
- `collisions`
- `energy_remaining`

## Event

イベントは 1 tick 中に起きた重要操作を表す。

主な `event_type`:

- `trash_detected`
- `trash_picked`
- `trash_delivered`
- `collision_detected`
- `battery_depleted`
- `battery_recovered`

## WebSocket Actions

Frontend は `/ws/simulation` に JSON action を送信して実行中の simulation を制御する。

- `start`: simulation を開始する
- `stop`: simulation を停止する
- `reset`: 任意の `config` で engine を再初期化し、開始する
- `update_config`: 任意の `config` で engine を再初期化する
- `manual_move`: `enable_manual_robot` が有効な場合、手動 Collector の移動方向を更新する

`manual_move` payload:

- `dx`: x 方向の入力。左が `-1`、右が `1`、停止が `0`
- `dy`: y 方向の入力。上が `-1`、下が `1`、停止が `0`
