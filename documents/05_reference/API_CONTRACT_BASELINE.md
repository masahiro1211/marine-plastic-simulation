# API Contract Baseline

## 1. Config

```json
{
  "width": 960,
  "height": 640,
  "steps": 600,
  "tick_interval_ms": 50,
  "scout_count": 2,
  "collector_count": 3,
  "marine_life_count": 10,
  "initial_trash_count": 18,
  "scout_speed": 2.2,
  "collector_speed": 1.8,
  "marine_life_speed": 1.6,
  "trash_drift_speed": 0.35,
  "trash_weight": 1.0,
  "avoid_marine_life_weight": 1.15,
  "avoid_robot_weight": 0.85,
  "random_weight": 0.3,
  "scout_sensor_radius": 110,
  "collector_sensor_radius": 42,
  "collector_pickup_radius": 16,
  "collision_radius": 18,
  "max_energy": 100,
  "trash_spawn_interval": 24,
  "marine_life_respawn_delay": 90
}
```

## 2. Snapshot

```json
{
  "tick": 42,
  "phase": "running",
  "config": {},
  "base": {},
  "agents": [],
  "stats": {},
  "score": {},
  "events": []
}
```

## 3. Agent

```json
{
  "id": "collector-1",
  "agent_type": "collector",
  "role": "collector",
  "x": 100.0,
  "y": 150.0,
  "vx": 1.0,
  "vy": 0.0,
  "alive": true,
  "status": "moving",
  "energy": 85.0,
  "target_id": "trash-3",
  "metadata": {
    "sensor_radius": 35
  }
}
```

## 4. Stats

```json
{
  "scouts": 2,
  "collectors": 3,
  "marine_life": 10,
  "trash_remaining": 18,
  "active_robots": 5,
  "delivered_trash": 4
}
```

## 5. Score

```json
{
  "total": 120.0,
  "trash_delivered": 12,
  "collisions": 1,
  "marine_life_stress": 8.5,
  "energy_remaining": 210.0
}
```

## 6. 最低限の event_type

- `trash_detected`
- `trash_picked`
- `trash_delivered`
- `collision_detected`
- `marine_life_lost`
- `marine_life_respawned`
- `battery_depleted`
- `battery_recovered`
