/** Lifecycle phases emitted by the backend runtime. */
export type SimulationPhase = "idle" | "running" | "stopped" | "completed";
/** Agent kinds currently supported by the frontend renderer registry. */
export type AgentType = "scout" | "collector" | "marine_life" | "trash" | "predator";

/** Runtime configuration shared between frontend and backend. */
export interface SimulationConfig {
  width: number;
  height: number;
  steps: number;
  tick_interval_ms: number;
  scout_count: number;
  collector_count: number;
  marine_life_count: number;
  initial_trash_count: number;
  scout_speed: number;
  collector_speed: number;
  marine_life_speed: number;
  trash_drift_speed: number;
  trash_weight: number;
  avoid_marine_life_weight: number;
  avoid_robot_weight: number;
  random_weight: number;
  scout_sensor_radius: number;
  collector_sensor_radius: number;
  collector_pickup_radius: number;
  marine_life_avoid_radius: number;
  collision_radius: number;
  base_radius: number;
  max_energy: number;
  energy_drain_per_tick: number;
  energy_charge_per_tick: number;
  return_speed_factor: number;
  low_energy_threshold: number;
  trash_spawn_interval: number;
  max_trash: number;
  trash_source_profile: "legacy" | "calm" | "rain" | "storm" | "harbor";
  trash_cluster_min: number;
  trash_cluster_max: number;
  current_x: number;
  current_y: number;
  current_strength: number;
  diffusion_strength: number;
  convergence_x?: number | null;
  convergence_y?: number | null;
  convergence_strength: number;
  source_outflow_strength: number;
  fish_eat_radius?: number;
  flock_zor_radius?: number;
  flock_zoo_radius?: number;
  flock_zoa_radius?: number;
  flock_alignment_weight?: number;
  flock_cohesion_weight?: number;
  flock_max_turn_rate?: number;
  flock_noise?: number;
  wall_repulsion_radius?: number;
  wall_repulsion_weight?: number;
  habitat_drift_weight?: number;
  speed_evade_factor?: number;
  speed_zor_factor?: number;
  speed_adapt_rate?: number;
  inter_species_repulsion_radius?: number;
  inter_species_repulsion_weight?: number;
  panic_radius?: number;
  panic_contagion_radius?: number;
  panic_heading_noise?: number;
  panic_speed_factor?: number;
  predator_count?: number;
  predator_speed?: number;
  predator_chase_speed_factor?: number;
  predator_sensor_radius?: number;
  predator_panic_radius?: number;
  predator_cluster_min_size?: number;
  predator_levy_min_steps?: number;
  predator_levy_max_steps?: number;
  predator_levy_mu?: number;
  sharing_mode: "global" | "local";
  enable_manual_robot: boolean;
  manual_penalty_ticks?: number;
  collision_cooldown_ticks?: number;
  scout_search_duration: number;
  scout_levy_min_steps: number;
  scout_levy_max_steps: number;
  scout_levy_mu: number;
  scout_battery_enabled: boolean;
}

/** Serialized base position and radius. */
export interface BaseState {
  x: number;
  y: number;
  radius: number;
}

/** Aggregated counters for one snapshot tick. */
export interface SimulationStats {
  scouts: number;
  collectors: number;
  marine_life: number;
  trash_remaining: number;
  active_robots: number;
  delivered_trash: number;
  robot_fish_contacts: number;
  fish_ate_trash: number;
}

/** Score breakdown for one snapshot tick. */
export interface ScoreState {
  total: number;
  trash_delivered: number;
  collisions: number;
  energy_remaining: number;
}

/** Domain event emitted by the backend engine. */
export interface SimulationEvent {
  event_type: string;
  actor_id?: string | null;
  target_id?: string | null;
  tick: number;
  payload: Record<string, unknown>;
}

/** Serialized state for one active simulation actor. */
export interface AgentState {
  id: string;
  agent_type: AgentType;
  role: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  alive: boolean;
  status: string;
  energy: number;
  target_id?: string | null;
  metadata: Record<string, unknown>;
}

/** Full snapshot payload returned by the backend. */
export interface SimulationSnapshot {
  tick: number;
  phase: SimulationPhase;
  config: SimulationConfig;
  base: BaseState;
  agents: AgentState[];
  stats: SimulationStats;
  score: ScoreState;
  events: SimulationEvent[];
  discovered_trash_ids: string[];
}

/** Historical score and count entry returned by the stats endpoint. */
export interface HistoryEntry {
  tick: number;
  delivered_trash: number;
  collisions: number;
  energy_remaining: number;
  total_score: number;
  trash_remaining: number;
}

/** Canvas renderer contract for one agent type. */
export interface Renderer {
  color: string;
  size: number;
  draw: (
    ctx: CanvasRenderingContext2D,
    size: number,
    agent: AgentState
  ) => void;
}
