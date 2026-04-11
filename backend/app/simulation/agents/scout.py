from __future__ import annotations

from app.simulation.agents.base import BaseAgent


class Scout(BaseAgent):
    AGENT_TYPE = "scout"
    ROLE = "scout"
    DEFAULT_RADIUS = 9.0

    def __init__(self, x: float, y: float, speed: float, sensor_radius: float, max_energy: float):
        super().__init__(x, y)
        self.speed = speed
        self.sensor_radius = sensor_radius
        self.energy = max_energy

    def base_metadata(self) -> dict:
        data = super().base_metadata()
        data.update({"sensor_radius": self.sensor_radius})
        return data

    def update(self, world) -> None:
        if not self.alive:
            return

        nearby_trash = world.find_trash_near(self.x, self.y, self.sensor_radius)
        for trash in nearby_trash:
            world.share_target(trash, self)

        if world.should_return_to_base(self):
            self.status = "returning"
            speed = self.speed * (world.config.return_speed_factor if self.energy <= 0 else 1.0)
            self.set_velocity_towards(world.base.x, world.base.y, speed)
        else:
            self.status = "scanning"
            self.add_random_motion(world.config.random_weight)
            self.clamp_speed(self.speed)

        world.apply_robot_avoidance(self)
        world.apply_marine_life_avoidance(self)
        self.move(world.config.width, world.config.height)
        world.drain_energy(self)
