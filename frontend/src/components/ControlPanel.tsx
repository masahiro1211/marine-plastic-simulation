import { useEffect, useRef, useState } from "react";
import type { SimulationConfig, SimulationPhase } from "../types";

type NumericConfigKey = {
  [Key in keyof SimulationConfig]: SimulationConfig[Key] extends
    | number
    | undefined
    ? Key
    : never;
}[keyof SimulationConfig] &
  keyof SimulationConfig;

type BoolConfigKey = {
  [Key in keyof SimulationConfig]: SimulationConfig[Key] extends boolean
    ? Key
    : never;
}[keyof SimulationConfig] &
  keyof SimulationConfig;

const DEFAULT_CONFIG: SimulationConfig = {
  width: 960,
  height: 640,
  steps: 600,
  tick_interval_ms: 50,
  scout_count: 2,
  collector_count: 3,
  marine_life_count: 18,
  initial_trash_count: 18,
  scout_speed: 2.2,
  collector_speed: 1.8,
  marine_life_speed: 3.2,
  trash_drift_speed: 0.35,
  trash_weight: 1.0,
  avoid_marine_life_weight: 1.15,
  avoid_robot_weight: 0.85,
  random_weight: 0.3,
  scout_sensor_radius: 110,
  collector_sensor_radius: 42,
  collector_pickup_radius: 16,
  marine_life_avoid_radius: 90,
  collision_radius: 18,
  base_radius: 48,
  max_energy: 100,
  energy_drain_per_tick: 0.55,
  energy_charge_per_tick: 3.0,
  return_speed_factor: 0.45,
  low_energy_threshold: 18,
  trash_spawn_interval: 24,
  max_trash: 30,
  trash_source_profile: "calm",
  trash_cluster_min: 1,
  trash_cluster_max: 3,
  current_x: 0.35,
  current_y: 0.08,
  current_strength: 0.08,
  diffusion_strength: 0.02,
  convergence_x: null,
  convergence_y: null,
  convergence_strength: 0.004,
  source_outflow_strength: 0.018,
  fish_eat_radius: 14,
  flock_zor_radius: 14,
  flock_zoo_radius: 45,
  flock_zoa_radius: 110,
  flock_alignment_weight: 0.6,
  flock_cohesion_weight: 0.35,
  flock_max_turn_rate: 0.35,
  flock_noise: 0.08,
  sharing_mode: "global",
  enable_manual_robot: true,
  scout_search_duration: 20,
  scout_levy_min_steps: 30,
  scout_levy_max_steps: 180,
  scout_levy_mu: 2.0,
  scout_battery_enabled: false,
};

const FIELDS: Array<[NumericConfigKey, string]> = [
  ["steps", "Steps"],
  ["scout_count", "Scout Robots"],
  ["collector_count", "Collector Robots"],
  ["initial_trash_count", "Initial Trash"],
  ["trash_cluster_min", "Trash Cluster Min"],
  ["trash_cluster_max", "Trash Cluster Max"],
];

const BOOL_FIELDS: Array<[BoolConfigKey, string]> = [
  ["enable_manual_robot", "Manual Robot"],
];

interface ControlPanelProps {
  connected: boolean;
  config: SimulationConfig;
  phase: SimulationPhase;
  onConnect: () => void;
  onDisconnect: () => void;
  onReset: (nextConfig: SimulationConfig) => void;
}

/**
 * Render controls for connection state and the core simulation parameters.
 *
 * @param props Component props.
 * @returns Mission control panel UI.
 */
export default function ControlPanel({
  connected,
  config: incomingConfig,
  phase,
  onConnect,
  onDisconnect,
  onReset,
}: ControlPanelProps) {
  const [config, setConfig] = useState<SimulationConfig>(DEFAULT_CONFIG);

  const initialIncomingConfigRef = useRef(incomingConfig);
  useEffect(() => {
    setConfig((prev) => ({ ...prev, ...initialIncomingConfigRef.current }));
  }, []);

  /**
   * Update one numeric config field in local form state.
   *
   * @param key Configuration key to change.
   * @param value Next raw input value.
   */
  const handleChange = (key: NumericConfigKey, value: string) => {
    setConfig((prev) => ({ ...prev, [key]: Number(value) }));
  };

  const handleToggle = (key: BoolConfigKey, checked: boolean) => {
    setConfig((prev) => ({ ...prev, [key]: checked }));
  };

  return (
    <div className="bg-slate-950/80 text-slate-100 p-4 rounded-2xl min-w-[220px] shadow-xl border border-cyan-900/50">
      <h3 className="text-base font-semibold mb-1">Mission Control</h3>
      <p className="text-xs text-slate-400 mb-4">Phase: {phase}</p>

      {!connected ? (
        <button
          className="block w-full py-2 mb-2 rounded-xl bg-cyan-700 hover:bg-cyan-600 text-white text-sm cursor-pointer"
          onClick={onConnect}
        >
          Start Simulation
        </button>
      ) : (
        <button
          className="block w-full py-2 mb-2 rounded-xl bg-rose-700 hover:bg-rose-600 text-white text-sm cursor-pointer"
          onClick={onDisconnect}
        >
          Stop Simulation
        </button>
      )}

      <button
        className="block w-full py-2 mb-3 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white text-sm cursor-pointer"
        onClick={() => onReset(config)}
      >
        Apply And Reset
      </button>

      <div className="space-y-2">
        {FIELDS.map(([key, label]) => (
          <label key={key} className="block text-xs">
            <span className="text-slate-300">{label}</span>
            <input
              type="number"
              value={config[key] ?? ""}
              onChange={(event) => handleChange(key, event.target.value)}
              className="block w-full p-2 mt-1 rounded-lg border border-slate-700 bg-slate-900 text-white text-sm"
            />
          </label>
        ))}
        {BOOL_FIELDS.map(([key, label]) => (
          <label key={key} className="flex items-center text-xs">
            <input
              type="checkbox"
              checked={config[key] ?? false}
              onChange={(event) => handleToggle(key, event.target.checked)}
              className="ml-2 rounded border-slate-700 bg-slate-900"
            />
            <span className="text-slate-300 ml-2">{label}</span>
          </label>
        ))}
      </div>
    </div>
  );
}
