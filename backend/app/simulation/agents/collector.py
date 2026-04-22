from __future__ import annotations
import math
from app.simulation.agents.base import BaseAgent

class Collector(BaseAgent):
    AGENT_TYPE = "collector"
    ROLE = "collector"
    DEFAULT_RADIUS = 11.0

    def __init__(
        self,
        x: float,
        y: float,
        speed: float,
        sensor_radius: float,
        pickup_radius: float,
        max_energy: float = 0.0,
        capacity: int = 1,
        is_manual: bool = False
    ):
        super().__init__(x, y)
        self.speed = speed
        self.sensor_radius = sensor_radius
        self.pickup_radius = pickup_radius
        self.energy = 999999.0

        self.capacity = capacity
        self.trash_held = 0
        self.is_manual = is_manual
        self.slowdown_ticks = 0
        self.manual_vx = 0.0
        self.manual_vy = 0.0

        self.is_upgraded = False  

        self.carrying_trash_id: str | None = None
        self._was_delivering = False

    def base_metadata(self) -> dict:
        data = super().base_metadata()
        data.update({
            "sensor_radius": self.sensor_radius,
            "pickup_radius": self.pickup_radius,
            "trash_held": self.trash_held,
            "capacity": self.capacity,
            "is_manual": self.is_manual,
            "slowdown_ticks": self.slowdown_ticks,
            "is_upgraded": self.is_upgraded
        })
        return data

    def apply_collision_penalty(self, penalty_ticks: int = 200) -> None:
        if self.is_manual and self.trash_held < self.capacity:
            self.slowdown_ticks = penalty_ticks

    def update(self, world) -> None:
        if not self.alive:
            return

        if self._was_delivering and self.carrying_trash_id is None:
            self.trash_held = 0
        self._was_delivering = (self.carrying_trash_id is not None)

        if not self.is_upgraded and world.tick >= (world.config.steps / 2):
            self.speed *= 1.5      
            self.capacity += 2     
            self.is_upgraded = True

        speed_multiplier = 1.0
        if self.is_manual and self.slowdown_ticks > 0:
            self.slowdown_ticks -= 1
            speed_multiplier = 0  
        
        current_speed = self.speed * speed_multiplier

        # 帰還モード
        if self.trash_held >= self.capacity:
            self.status = "delivering"
            self.target_id = "base"
            self.carrying_trash_id = "dummy_for_engine"
            self.set_velocity_towards(world.base.x, world.base.y, current_speed)

        #  手動ロボットの移動とゴミ回収
        elif self.is_manual:
            # 減速中であることが内部データで分かるようにステータスを変更
            self.status = "manual" if self.slowdown_ticks == 0 else "slowed_down"
            self.target_id = None
            
            norm = math.hypot(self.manual_vx, self.manual_vy)
            if norm > 0:
                self.vx = (self.manual_vx / norm) * current_speed
                self.vy = (self.manual_vy / norm) * current_speed
            else:
                self.vx = 0.0
                self.vy = 0.0

            #  追加: 手動ロボット用のゴミ回収判定
            for t in world.trash_items:
                if t.alive and self.distance_to(t) <= self.pickup_radius:
                    t.alive = False
                    self.trash_held += 1
                    world.shared_targets.pop(t.id, None)
                    break # 1ステップに1つだけ拾う

        # 自動ロボットの移動
        else:
            target = world.find_collector_target(self)
            if target is not None:
                self.status = "collecting"
                self.target_id = target.id
                self.set_velocity_towards(target.x, target.y, current_speed)
                
                if self.distance_to(target) <= self.pickup_radius:
                    if target.alive:
                        target.alive = False
                        self.trash_held += 1
                        world.shared_targets.pop(target.id, None)
            else:
                self.status = "patrolling"
                self.target_id = None
                self.add_random_motion(world.config.random_weight)
                self.clamp_speed(current_speed)

        #  変更: 手動操作中は魚避け・仲間避けをオフにする（ぶつかれるようにする）
        if not self.is_manual:
            world.apply_robot_avoidance(self)
            world.apply_marine_life_avoidance(self)
            
        self.move(world.config.width, world.config.height)