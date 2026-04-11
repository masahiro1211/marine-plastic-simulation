from __future__ import annotations

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
        max_energy: float,
    ):
        super().__init__(x, y)
        self.speed = speed
        self.sensor_radius = sensor_radius
        self.pickup_radius = pickup_radius
        self.energy = max_energy
        self.carrying_trash_id: str | None = None

    def base_metadata(self) -> dict:
        data = super().base_metadata()
        data.update(
            {
                "sensor_radius": self.sensor_radius,
                "pickup_radius": self.pickup_radius,
                "carrying": self.carrying_trash_id is not None,
            }
        )
        return data

    def update(self, world) -> None:
        if not self.alive:
            return

        if self.carrying_trash_id:
            self.status = "delivering"
            self.target_id = "base"
            self.set_velocity_towards(world.base.x, world.base.y, self.speed)
        else:
            target = world.find_collector_target(self)
            if target is not None:
                self.status = "collecting"
                self.target_id = target.id
                self.set_velocity_towards(target.x, target.y, self.speed)
                if self.distance_to(target) <= self.pickup_radius:
                    world.pick_trash(self, target)
            else:
                self.status = "patrolling"
                self.target_id = None
                self.add_random_motion(world.config.random_weight)
                self.clamp_speed(self.speed)

        if world.should_return_to_base(self):
            self.status = "returning_low_power" if self.energy <= 0 else "returning"
            self.target_id = "base"
            self.set_velocity_towards(
                world.base.x,
                world.base.y,
                self.speed * (world.config.return_speed_factor if self.energy <= 0 else 1.0),
            )

        world.apply_robot_avoidance(self)
        world.apply_marine_life_avoidance(self)
        self.move(world.config.width, world.config.height)
        world.drain_energy(self)
