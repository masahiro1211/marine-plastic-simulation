# Domain Model

## 1. エンティティ

### Environment

- ステージサイズ
- ステップ数
- 時刻管理
- 占有状態

### Robot

- `role`: scout or collector
- `energy`
- `sensor_radius`
- `status`
- `target_id`

### MarineLife

- `stress`
- `avoidance_count`
- `alive`

### Trash

- `position`
- `drift_vector`
- `collected`

### SharedTarget

- `trash_id`
- `reported_by`
- `position`
- `confidence`
- `tick`

## 2. 役割境界

### Scout

- 検知する
- 共有する
- 回収しない

### Collector

- 共有された情報を受ける
- 近接確認する
- 回収する

### MarineLife

- ロボットを避ける
- ストレスを蓄積する

## 3. 集計概念

### Stats

- 生存数
- 稼働ロボット数
- 残ごみ数

### Score

- 回収量
- 衝突回数
- ストレス総量
- 残バッテリー

### Event

- 検知
- 共有
- 回収
- 衝突
- 停止
- 回復
