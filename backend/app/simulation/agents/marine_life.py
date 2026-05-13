from __future__ import annotations

import math
import random

from app.simulation.agents.base import BaseAgent


class MarineLife(BaseAgent):
    """Marine life actor that schools via Couzin zonal rules and flees robots.

    Heading is updated each tick by the highest-priority steering source:
    robot avoidance first, then wall repulsion and habitat drift (always
    blended in), then the Couzin zone of repulsion (all fish), otherwise
    zone-of-orientation alignment and zone-of-attraction cohesion (same
    species only).  Speed adapts smoothly per Hemelrijk & Hildenbrandt (2008).
    """

    AGENT_TYPE = "marine_life"
    ROLE = "marine_life"
    DEFAULT_RADIUS = 10.0

    def __init__(self, x: float, y: float, speed: float, species_id: int = 0):
        """Initialize a marine life actor.

        Args:
            x: Initial horizontal position.
            y: Initial vertical position.
            speed: Base movement speed.
            species_id: Species group index (0 = shallow, 1 = deep).
        """
        super().__init__(x, y)
        self.species_id: int = species_id
        self.base_speed: float = speed
        self.speed: float = speed
        self.energy = 1.0
        self.heading = math.atan2(self.vy, self.vx) if (self.vx or self.vy) else random.uniform(-math.pi, math.pi)
        self._robots_inside: set[str] = set()
        self.contact_count = 0
        self.ate_trash_count = 0
        self.panic: bool = False

    def base_metadata(self) -> dict:
        """Return metadata including species identifier for the renderer.

        Returns:
            Metadata dictionary used in serialized agent state.
        """
        return {"radius": self.radius, "species_id": self.species_id, "panic": self.panic}

    def update(self, world) -> None:
        """Advance the marine life actor by one tick.

        Steering priority (highest to lowest):
        1. Robot avoidance — weighted by inverse distance to all nearby robots
        2. Wall repulsion — always blended in (Couzin 2002 boundary condition)
        3. Habitat depth drift — very weak Y-axis pull toward preferred band
        4. Couzin ZoR — repulsion from any fish regardless of species
        5. Couzin ZoO + ZoA — alignment/cohesion with same-species fish only

        Speed adapts smoothly toward a status-derived target
        (Hemelrijk & Hildenbrandt 2008).

        Args:
            world: Active simulation runtime.
        """
        if not self.alive:
            return

        cfg = world.config

        nearby_robots = world.find_robots_near(self.x, self.y, cfg.marine_life_avoid_radius)
        nearby_predators = world.find_predators_near(self.x, self.y, cfg.marine_life_avoid_radius)
        current_ids = {robot.id for robot in nearby_robots}
        newly_entered = current_ids - self._robots_inside
        if newly_entered:
            count = len(newly_entered)
            self.contact_count += count
            world.robot_fish_contacts += count
        self._robots_inside = current_ids

        threats = nearby_robots + nearby_predators
        if threats:
            self.status = "evading"
            dx, dy = 0.0, 0.0
            for threat in threats:
                dist = max(self.distance_to(threat), 1.0)
                w = 1.0 / dist
                dx += (self.x - threat.x) * w
                dy += (self.y - threat.y) * w
            if self.panic and (dx != 0.0 or dy != 0.0):
                angle = math.atan2(dy, dx) + random.uniform(
                    -cfg.panic_heading_noise, cfg.panic_heading_noise
                )
                magnitude = math.hypot(dx, dy)
                dx = math.cos(angle) * magnitude
                dy = math.sin(angle) * magnitude
            desired: tuple[float, float] | None = (dx, dy)
        else:
            desired = self._flock_steering(world, cfg)

        wall = self._wall_repulsion_force(cfg)
        if wall[0] != 0.0 or wall[1] != 0.0:
            desired = (
                (desired[0] if desired else 0.0) + wall[0],
                (desired[1] if desired else 0.0) + wall[1],
            )

        inter_rep = self._inter_species_repulsion(world, cfg)
        if inter_rep[0] != 0.0 or inter_rep[1] != 0.0:
            desired = (
                (desired[0] if desired else 0.0) + inter_rep[0],
                (desired[1] if desired else 0.0) + inter_rep[1],
            )

        habitat = self._habitat_drift(cfg)
        if habitat[1] != 0.0:
            desired = (
                (desired[0] if desired else 0.0) + habitat[0],
                (desired[1] if desired else 0.0) + habitat[1],
            )

        if self.panic:
            self.speed = self.base_speed * cfg.panic_speed_factor
        else:
            if self.status == "evading":
                target_speed = self.base_speed * cfg.speed_evade_factor
            elif self.status == "spacing":
                target_speed = self.base_speed * cfg.speed_zor_factor
            else:
                target_speed = self.base_speed
            self.speed += (target_speed - self.speed) * cfg.speed_adapt_rate

        self._advance_heading(desired, cfg)

        self.vx = math.cos(self.heading) * self.speed
        self.vy = math.sin(self.heading) * self.speed
        self.move(cfg.width, cfg.height)

        self._eat_nearby_trash(world, cfg)

    def _wall_repulsion_force(self, cfg) -> tuple[float, float]:
        """Compute a steering force that pushes away from world boundaries.

        Force magnitude scales linearly with proximity: zero at
        wall_repulsion_radius distance, maximum at the wall itself.
        Standard boundary avoidance for bounded Couzin (2002) models.

        Args:
            cfg: Current simulation configuration.

        Returns:
            Steering vector (dx, dy) directed away from nearby walls.
        """
        wr = cfg.wall_repulsion_radius
        dx, dy = 0.0, 0.0
        if self.x < wr:
            dx += (wr - self.x) / wr
        if self.x > cfg.width - wr:
            dx -= (self.x - (cfg.width - wr)) / wr
        if self.y < wr:
            dy += (wr - self.y) / wr
        if self.y > cfg.height - wr:
            dy -= (self.y - (cfg.height - wr)) / wr
        if dx == 0.0 and dy == 0.0:
            return (0.0, 0.0)
        return (dx * cfg.wall_repulsion_weight, dy * cfg.wall_repulsion_weight)

    def _habitat_drift(self, cfg) -> tuple[float, float]:
        """Compute a weak Y-axis pull toward the species preferred depth band.

        Three depth bands divide the world into thirds:
          Species 0 → shallow  (target y = height / 6)
          Species 1 → mid      (target y = height / 2)
          Species 2 → deep     (target y = height × 5 / 6)
        Corresponds to the external drift term in extended Couzin models.

        Args:
            cfg: Current simulation configuration.

        Returns:
            Steering vector (0, dy) toward the preferred depth band.
        """
        if cfg.habitat_drift_weight <= 0.0:
            return (0.0, 0.0)
        targets = {0: cfg.height / 6, 1: cfg.height / 2, 2: cfg.height * 5 / 6}
        target_y = targets.get(self.species_id, cfg.height / 2)
        dy = (target_y - self.y) / cfg.height
        return (0.0, dy * cfg.habitat_drift_weight)

    def _inter_species_repulsion(self, world, cfg) -> tuple[float, float]:
        """Compute a medium-range repulsion from fish of different species.

        Covers the annular zone between flock_zor_radius (already handled by
        ZoR steering) and inter_species_repulsion_radius.  Returned as a
        normalised vector so the force magnitude is predictable regardless of
        how many inter-species fish are nearby.  Extension of the Couzin(2002)
        model to inter-group interactions.

        Args:
            world: Active simulation runtime.
            cfg: Current simulation configuration.

        Returns:
            Repulsion steering vector directed away from nearby inter-species
            fish, or (0.0, 0.0) when none are present.
        """
        radius = cfg.inter_species_repulsion_radius
        others = [
            life
            for life in world.find_marine_life_near(self.x, self.y, radius)
            if life is not self
            and life.species_id != self.species_id
            and self.distance_to(life) >= cfg.flock_zor_radius
        ]
        if not others:
            return (0.0, 0.0)
        dx = sum(self.x - o.x for o in others)
        dy = sum(self.y - o.y for o in others)
        norm = math.hypot(dx, dy) or 1.0
        return (
            dx / norm * cfg.inter_species_repulsion_weight,
            dy / norm * cfg.inter_species_repulsion_weight,
        )

    def compute_panic(self, world, cfg, prev_panic_map: dict[str, bool]) -> bool:
        """Compute the panic state for this tick.

        A fish panics when (a) any robot is within ``panic_radius`` or
        (b) any same-species neighbour was panicking last tick within
        ``panic_contagion_radius`` (information cascade per Herbert-Read
        et al. 2013).  Read from a snapshot of the previous tick to keep
        the propagation symmetric across iteration order.

        Args:
            world: Active simulation runtime.
            cfg: Current simulation configuration.
            prev_panic_map: Snapshot of panic flags from the previous tick.

        Returns:
            New panic flag for this fish.
        """
        for robot in world.find_robots_near(self.x, self.y, cfg.panic_radius):
            if self.distance_to(robot) < cfg.panic_radius:
                return True
        for pred in world.find_predators_near(
            self.x, self.y, cfg.predator_panic_radius
        ):
            if self.distance_to(pred) < cfg.predator_panic_radius:
                return True
        for n in world.find_marine_life_near(self.x, self.y, cfg.panic_contagion_radius):
            if n is self or n.species_id != self.species_id:
                continue
            if prev_panic_map.get(n.id, False):
                return True
        return False

    def _eat_nearby_trash(self, world, cfg) -> None:
        """Ingest one nearby trash item if any is within reach.

        Args:
            world: Active simulation runtime.
            cfg: Current simulation configuration.
        """
        nearby = world.find_trash_near(self.x, self.y, cfg.fish_eat_radius)
        if not nearby:
            return
        world.fish_eats_trash(self, nearby[0])

    def _flock_steering(self, world, cfg) -> tuple[float, float] | None:
        """Compute Couzin zonal steering with species-aware neighbour filtering.

        ZoR applies to all fish regardless of species (physical avoidance).
        ZoO and ZoA apply only to same-species fish (intraspecific schooling).
        Alignment is normalised by neighbour count (Vicsek 1995).

        Args:
            world: Active simulation runtime.
            cfg: Current simulation configuration.

        Returns:
            Desired steering vector, or None if no neighbours influence heading.
        """
        search_radius = max(cfg.flock_zor_radius, cfg.flock_zoo_radius, cfg.flock_zoa_radius)
        all_neighbours = [
            life
            for life in world.find_marine_life_near(self.x, self.y, search_radius)
            if life is not self
        ]

        if not all_neighbours:
            self.status = "swimming"
            return None

        zor: list[MarineLife] = []
        zoo: list[MarineLife] = []
        zoa: list[MarineLife] = []
        for other in all_neighbours:
            distance = self.distance_to(other)
            if distance < cfg.flock_zor_radius:
                zor.append(other)
            elif other.species_id == self.species_id:
                if distance < cfg.flock_zoo_radius:
                    zoo.append(other)
                elif distance <= cfg.flock_zoa_radius:
                    zoa.append(other)

        if zor:
            self.status = "spacing"
            dx = sum(self.x - other.x for other in zor)
            dy = sum(self.y - other.y for other in zor)
            return (dx, dy)

        # Panicking fish abandon orientation/cohesion entirely (flash expansion).
        if self.panic:
            self.status = "swimming"
            return None

        dx = 0.0
        dy = 0.0
        # Panicking neighbours are excluded from alignment to avoid amplifying noise.
        zoo_calm = [other for other in zoo if not other.panic]
        if zoo_calm:
            cos_sum = sum(math.cos(other.heading) for other in zoo_calm) / len(zoo_calm)
            sin_sum = sum(math.sin(other.heading) for other in zoo_calm) / len(zoo_calm)
            dx += cos_sum * cfg.flock_alignment_weight
            dy += sin_sum * cfg.flock_alignment_weight
        # Panicking neighbours invert their cohesion contribution (Couzin ZoA
        # extension): nearby calm fish are pushed away from a panicking peer.
        if zoa:
            sum_x = 0.0
            sum_y = 0.0
            for other in zoa:
                sign = -1.0 if other.panic else 1.0
                sum_x += (other.x - self.x) * sign
                sum_y += (other.y - self.y) * sign
            norm = math.hypot(sum_x, sum_y) or 1.0
            dx += sum_x / norm * cfg.flock_cohesion_weight
            dy += sum_y / norm * cfg.flock_cohesion_weight

        if dx == 0.0 and dy == 0.0:
            self.status = "swimming"
            return None

        self.status = "schooling"
        return (dx, dy)

    def _advance_heading(self, desired: tuple[float, float] | None, cfg) -> None:
        """Rotate the current heading toward the desired direction with limits.

        Args:
            desired: Target steering vector, or None to keep current heading.
            cfg: Current simulation configuration.
        """
        if desired is not None and (desired[0] != 0.0 or desired[1] != 0.0):
            target = math.atan2(desired[1], desired[0])
            diff = (target - self.heading + math.pi) % (2 * math.pi) - math.pi
            max_turn = cfg.flock_max_turn_rate
            if diff > max_turn:
                diff = max_turn
            elif diff < -max_turn:
                diff = -max_turn
            self.heading += diff
        self.heading += random.uniform(-cfg.flock_noise, cfg.flock_noise)
