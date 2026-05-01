import { useEffect, useState } from "react";
import type { SimulationConfig, SimulationPhase } from "../types";

const DEFAULT_CONFIG: SimulationConfig = {
  width: 960,
  height: 640,
  steps: 600,
  tick_interval_ms: 50,
  scout_count: 2,
  collector_count: 3,
  marine_life_count: 10,
  initial_trash_count: 18,
  scout_speed: 2.2,
  collector_speed: 1.8,
  marine_life_speed: 1.6,
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
  flock_zor_radius: 14,
  flock_zoo_radius: 45,
  flock_zoa_radius: 110,
  flock_alignment_weight: 0.6,
  flock_cohesion_weight: 0.35,
  flock_max_turn_rate: 0.35,
  flock_noise: 0.08,
  sharing_mode: "global",
};

const FIELDS: Array<[keyof SimulationConfig, string]> = [
  ["steps", "Steps"],
  ["scout_count", "Scout Robots"],
  ["collector_count", "Collector Robots"],
  ["marine_life_count", "Marine Life"],
  ["initial_trash_count", "Initial Trash"],
  ["flock_zoo_radius", "Flock Orientation Range"],
  ["flock_zoa_radius", "Flock Attraction Range"],
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

  useEffect(() => {
    setConfig((prev) => ({ ...prev, ...incomingConfig }));
  }, [incomingConfig]);

  /**
   * Update one numeric config field in local form state.
   *
   * @param key Configuration key to change.
   * @param value Next raw input value.
   */
  const handleChange = (key: keyof SimulationConfig, value: string) => {
    setConfig((prev) => ({ ...prev, [key]: Number(value) }));
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
              value={config[key]}
              onChange={(event) => handleChange(key, event.target.value)}
              className="block w-full p-2 mt-1 rounded-lg border border-slate-700 bg-slate-900 text-white text-sm"
            />
          </label>
        ))}
      </div>
    </div>
  );
}
