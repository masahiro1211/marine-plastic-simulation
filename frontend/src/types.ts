/** Lifecycle phases emitted by the backend runtime. */
export type SimulationPhase = "idle" | "running" | "stopped" | "completed";
/** Agent kinds currently supported by the frontend renderer registry. */
export type AgentType = "scout" | "collector" | "marine_life" | "trash";

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
  stress_gain_per_robot: number;
  stress_decay_per_tick: number;
  stress_threshold: number;
  marine_life_respawn_delay: number;
  sharing_mode: "global" | "local";
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
}

/** Score breakdown for one snapshot tick. */
export interface ScoreState {
  total: number;
  trash_delivered: number;
  collisions: number;
  marine_life_stress: number;
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
}

/** Historical score and count entry returned by the stats endpoint. */
export interface HistoryEntry {
  tick: number;
  delivered_trash: number;
  collisions: number;
  marine_life_stress: number;
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
