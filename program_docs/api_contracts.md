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
- `stress_gain_per_robot`, `stress_decay_per_tick`, `stress_threshold`
- `marine_life_respawn_delay`

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
- `status`
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

## Score

- `total`
- `trash_delivered`
- `collisions`
- `marine_life_stress`
- `energy_remaining`

## Event

イベントは 1 tick 中に起きた重要操作を表す。

主な `event_type`:

- `trash_detected`
- `trash_picked`
- `trash_delivered`
- `collision_detected`
- `marine_life_lost`
- `marine_life_respawned`
- `battery_depleted`
- `battery_recovered`
