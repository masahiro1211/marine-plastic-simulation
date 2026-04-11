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
  "trash_count": 20,
  "scout_speed": 1.8,
  "collector_speed": 1.4,
  "trash_drift_speed": 0.2,
  "trash_weight": 1.0,
  "avoid_fish_weight": 1.2,
  "avoid_robot_weight": 0.8,
  "random_weight": 0.3,
  "scout_sensor_radius": 90,
  "collector_sensor_radius": 35,
  "max_energy": 100
}
```

## 2. Snapshot

```json
{
  "tick": 42,
  "phase": "running",
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
  "agent_type": "robot",
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
  "active_robots": 5
}
```

## 5. Score

```json
{
  "total": 120.0,
  "trash_collected": 12,
  "collisions": 1,
  "marine_life_stress": 8.5,
  "energy_remaining": 210.0
}
```

## 6. 最低限の event_type

- `trash_detected`
- `trash_shared`
- `trash_collected`
- `collision_detected`
- `marine_life_avoided`
- `battery_depleted`
- `battery_recovered`
