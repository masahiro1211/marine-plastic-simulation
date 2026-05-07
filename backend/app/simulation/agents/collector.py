from __future__ import annotations
import math
from app.simulation.agents.base import BaseAgent

class Collector(BaseAgent):
    """Collector robot that picks up trash and returns it to base."""
    AGENT_TYPE = "collector"
    ROLE = "collector"
    DEFAULT_RADIUS = 11.0

    def __init__(
        self, x: float, y: float, speed: float, sensor_radius: float, pickup_radius: float, max_energy: float,
    ):
        super().__init__(x, y)
        self.speed = speed
        self.sensor_radius = sensor_radius
        self.pickup_radius = pickup_radius
        self.energy = max_energy
        self.carrying_trash_id: str | None = None
        
        # 手動ロボット用の追加プロパティ
        self.is_manual = False
        self.manual_vx = 0.0
        self.manual_vy = 0.0
        self.slowdown_ticks = 0
        self.is_upgraded = False

    def base_metadata(self) -> dict:
        data = super().base_metadata()
        data.update({
            "sensor_radius": self.sensor_radius,
            "pickup_radius": self.pickup_radius,
            "carrying": self.carrying_trash_id is not None,
            "is_manual": self.is_manual,
            "slowdown_ticks": self.slowdown_ticks,
            "is_upgraded": self.is_upgraded
        })
        return data

    def apply_collision_penalty(self, penalty_ticks: int = 200) -> None:
        """満載帰還中以外なら、衝突ペナルティ（減速）を適用する"""
        if self.is_manual and self.carrying_trash_id is None:
            self.slowdown_ticks = penalty_ticks

    def update(self, world) -> None:
        if not self.alive:
            return

        # Phase 2 (時間半分経過) でのスピードアップ処理
        if not self.is_upgraded and world.tick >= (world.config.steps / 2):
            self.speed *= 3.0  # PRの記載に合わせて3倍
            self.is_upgraded = True

        # 衝突ペナルティの減速処理 (完全停止)
        speed_multiplier = 1.0
        if self.is_manual and self.slowdown_ticks > 0:
            self.slowdown_ticks -= 1
            speed_multiplier = 0.0

        current_speed = self.speed * speed_multiplier

        # 手動操作モード
        if self.is_manual:
            self.status = "manual" if self.slowdown_ticks == 0 else "slowed_down"
            self.target_id = None
            
            # WASDに基づく移動
            norm = math.hypot(self.manual_vx, self.manual_vy)
            if norm > 0:
                self.vx = (self.manual_vx / norm) * current_speed
                self.vy = (self.manual_vy / norm) * current_speed
            else:
                self.vx = 0.0
                self.vy = 0.0

            # 基地への帰還表示（描画用）
            if self.carrying_trash_id:
                self.status = "delivering"

            # ゴミの回収 (1個専用。拾うと自動でイベントが発行される)
            if self.carrying_trash_id is None:
                local_trash = world.find_trash_near(self.x, self.y, self.pickup_radius)
                if local_trash:
                    target = min(local_trash, key=self.distance_to)
                    world.pick_trash(self, target)

        # 自動操作モード
        else:
            # 1. 優先確認：目の前（pickup_radius内）に拾えるゴミがあるかチェック
            target = None
            if not self.carrying_trash_id:
                target = world.find_collector_target(self)
                if target is not None and self.distance_to(target) <= self.pickup_radius:
                    world.pick_trash(self, target)

            # --- ここから修正 ---
            is_at_base = self.distance_to_point(world.base.x, world.base.y) <= world.base.radius

            # 2. 状態の優先順位に基づく行動決定（if/elif/elseで完全排他にする）
            if self.carrying_trash_id:
                # 優先度1: 運搬中
                self.status = "delivering"
                self.target_id = "base"
                self.set_velocity_towards(world.base.x, world.base.y, current_speed)
                
            elif is_at_base and self.energy < world.config.max_energy:
                # 優先度2: 基地で充電中（バッテリーがMAXになるまで出撃しない）
                self.status = "charging"
                self.target_id = "base"
                self.vx = 0.0
                self.vy = 0.0
                
            elif self.energy <= world.config.low_energy_threshold or self.energy <= 0:
                # 優先度3: エネルギー低下（帰還）
                self.status = "returning_low_power" if self.energy <= 0 else "returning"
                self.target_id = "base"
                self.set_velocity_towards(
                    world.base.x,
                    world.base.y,
                    current_speed * (world.config.return_speed_factor if self.energy <= 0 else 1.0),
                )
                
            elif target is not None:
                # 優先度4: ゴミの追跡
                self.status = "collecting"
                self.target_id = target.id
                self.set_velocity_towards(target.x, target.y, current_speed)
                
            else:
                # 優先度5: 通常パトロール
                self.status = "patrolling"
                self.target_id = None
                self.add_random_motion(world.config.random_weight)
                self.clamp_speed(current_speed)
        # 手動操作中は魚避け・仲間避けをオフにする
        if not self.is_manual:
            world.apply_robot_avoidance(self)
            world.apply_marine_life_avoidance(self)
            
        self.move(world.config.width, world.config.height)
        world.drain_energy(self)