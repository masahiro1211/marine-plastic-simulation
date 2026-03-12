from __future__ import annotations

import math
import random

import numpy as np


class Agent:
    """Base class for all agents in the simulation."""

    _id_counter = 0

    def __init__(self, x: float, y: float, agent_type: str):
        Agent._id_counter += 1
        self.id = Agent._id_counter
        self.agent_type = agent_type
        self.x = x
        self.y = y
        self.angle = random.uniform(0, 2 * math.pi)
        self.energy = 100.0
        self.alive = True

    def distance_to(self, other: Agent) -> float:
        return math.hypot(self.x - other.x, self.y - other.y)

    def angle_to(self, other: Agent) -> float:
        return math.atan2(other.y - self.y, other.x - self.x)

    def wrap_position(self, width: float, height: float):
        self.x = self.x % width
        self.y = self.y % height

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "agent_type": self.agent_type,
            "x": self.x,
            "y": self.y,
            "angle": self.angle,
            "energy": self.energy,
            "alive": self.alive,
        }


class Fish(Agent):
    """Small fish agent that uses Boids-like flocking behaviour.

    Behaviours:
    - Separation: avoid crowding neighbours
    - Alignment: steer towards average heading of neighbours
    - Cohesion: steer towards average position of neighbours
    - Avoidance: flee from predators
    - Plastic danger: lose energy when near plastic debris
    """

    PERCEPTION_RADIUS = 60.0
    SEPARATION_RADIUS = 20.0
    PREDATOR_FLEE_RADIUS = 100.0
    PLASTIC_DAMAGE_RADIUS = 15.0

    def __init__(self, x: float, y: float, speed: float = 2.0):
        super().__init__(x, y, "fish")
        self.speed = speed

    def update(self, agents: list[Agent], width: float, height: float):
        if not self.alive:
            return

        neighbours: list[Fish] = []
        predators: list[Agent] = []
        plastics: list[Agent] = []

        for a in agents:
            if a is self or not a.alive:
                continue
            d = self.distance_to(a)
            if a.agent_type == "fish" and d < self.PERCEPTION_RADIUS:
                neighbours.append(a)
            elif a.agent_type == "predator" and d < self.PREDATOR_FLEE_RADIUS:
                predators.append(a)
            elif a.agent_type == "plastic" and d < self.PLASTIC_DAMAGE_RADIUS:
                plastics.append(a)

        dx, dy = 0.0, 0.0

        # --- Separation ---
        for n in neighbours:
            if self.distance_to(n) < self.SEPARATION_RADIUS:
                dx -= (n.x - self.x)
                dy -= (n.y - self.y)

        # --- Alignment ---
        if neighbours:
            avg_angle = math.atan2(
                sum(math.sin(n.angle) for n in neighbours),
                sum(math.cos(n.angle) for n in neighbours),
            )
            dx += math.cos(avg_angle) * 0.5
            dy += math.sin(avg_angle) * 0.5

        # --- Cohesion ---
        if neighbours:
            cx = sum(n.x for n in neighbours) / len(neighbours)
            cy = sum(n.y for n in neighbours) / len(neighbours)
            dx += (cx - self.x) * 0.01
            dy += (cy - self.y) * 0.01

        # --- Flee from predators ---
        for p in predators:
            flee_strength = 3.0
            dx -= (p.x - self.x) * flee_strength / max(self.distance_to(p), 1)
            dy -= (p.y - self.y) * flee_strength / max(self.distance_to(p), 1)

        # --- Plastic damage ---
        for _ in plastics:
            self.energy -= 0.5

        if self.energy <= 0:
            self.alive = False
            return

        # Apply steering
        if dx != 0 or dy != 0:
            target_angle = math.atan2(dy, dx)
            # Smooth turning
            diff = (target_angle - self.angle + math.pi) % (2 * math.pi) - math.pi
            self.angle += diff * 0.1
        else:
            # Random wander
            self.angle += random.uniform(-0.3, 0.3)

        self.x += math.cos(self.angle) * self.speed
        self.y += math.sin(self.angle) * self.speed
        self.wrap_position(width, height)


class Predator(Agent):
    """Larger predatory fish that chases and eats smaller fish."""

    CHASE_RADIUS = 150.0
    EAT_RADIUS = 10.0

    def __init__(self, x: float, y: float, speed: float = 1.5):
        super().__init__(x, y, "predator")
        self.speed = speed
        self.energy = 150.0

    def update(self, agents: list[Agent], width: float, height: float):
        if not self.alive:
            return

        # Find nearest fish
        nearest_fish: Fish | None = None
        nearest_dist = float("inf")

        for a in agents:
            if a.agent_type == "fish" and a.alive:
                d = self.distance_to(a)
                if d < self.CHASE_RADIUS and d < nearest_dist:
                    nearest_fish = a
                    nearest_dist = d

        if nearest_fish is not None:
            # Chase
            target_angle = self.angle_to(nearest_fish)
            diff = (target_angle - self.angle + math.pi) % (2 * math.pi) - math.pi
            self.angle += diff * 0.08

            # Eat
            if nearest_dist < self.EAT_RADIUS:
                nearest_fish.alive = False
                self.energy = min(self.energy + 30, 200)
        else:
            self.angle += random.uniform(-0.2, 0.2)

        self.energy -= 0.1
        if self.energy <= 0:
            self.alive = False
            return

        self.x += math.cos(self.angle) * self.speed
        self.y += math.sin(self.angle) * self.speed
        self.wrap_position(width, height)


class Plastic(Agent):
    """Marine plastic debris that drifts with current and harms fish."""

    def __init__(self, x: float, y: float, drift_speed: float = 0.3):
        super().__init__(x, y, "plastic")
        self.drift_speed = drift_speed
        self.energy = 999  # Plastic doesn't degrade easily

    def update(self, agents: list[Agent], width: float, height: float):
        if not self.alive:
            return
        # Drift with simulated ocean current (sinusoidal pattern)
        self.x += math.cos(self.angle) * self.drift_speed
        self.y += math.sin(self.angle) * self.drift_speed * 0.5
        # Slowly change drift direction
        self.angle += random.uniform(-0.05, 0.05)
        self.wrap_position(width, height)
