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

type PresetId = "easy" | "normal" | "hard";

const PRESETS: Record<PresetId, { label: string; icon: string; overrides: Partial<SimulationConfig> }> = {
  easy: {
    label: "やさしい",
    icon: "🐚",
    overrides: { scout_count: 3, collector_count: 4, marine_life_count: 10, initial_trash_count: 12 },
  },
  normal: {
    label: "ふつう",
    icon: "🐟",
    overrides: { scout_count: 2, collector_count: 3, marine_life_count: 18, initial_trash_count: 18 },
  },
  hard: {
    label: "むずかしい",
    icon: "🦈",
    overrides: { scout_count: 1, collector_count: 2, marine_life_count: 26, initial_trash_count: 26 },
  },
};

interface ControlPanelProps {
  connected: boolean;
  config: SimulationConfig;
  phase: SimulationPhase;
  onConnect: () => void;
  onDisconnect: () => void;
  onReset: (nextConfig: SimulationConfig) => void | Promise<void>;
}

/**
 * Render Reef Patrol mission controls — difficulty preset, fleet composition,
 * manual-control toggle, and start/reset actions. The panel keeps the same
 * external props as before so it can drop into App.tsx with no other changes.
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
  const [preset, setPreset] = useState<PresetId>("normal");

  const initialIncomingConfigRef = useRef(incomingConfig);
  useEffect(() => {
    setConfig((prev) => ({ ...prev, ...initialIncomingConfigRef.current }));
  }, []);

  /**
   * Apply a difficulty preset over the current draft config.
   *
   * @param id Preset id to activate.
   */
  const handlePreset = (id: PresetId) => {
    setPreset(id);
    setConfig((prev) => ({ ...prev, ...PRESETS[id].overrides }));
  };

  /**
   * Update one numeric config field in local form state.
   *
   * @param key Configuration key to change.
   * @param value Next numeric value.
   */
  const handleNumber = (key: NumericConfigKey, value: number) => {
    setConfig((prev) => ({ ...prev, [key]: value }));
  };

  /**
   * Update one boolean config field in local form state.
   *
   * @param key Configuration key to change.
   * @param checked Next checkbox value.
   */
  const handleToggle = (key: BoolConfigKey, checked: boolean) => {
    setConfig((prev) => ({ ...prev, [key]: checked }));
  };

  const phaseTone =
    phase === "running"
      ? "text-emerald-600"
      : phase === "completed"
      ? "text-amber-600"
      : phase === "stopped"
      ? "text-rose-600"
      : "text-slate-500";

  return (
    <div className="bg-white text-[#1a3744] p-5 rounded-2xl w-[256px] shrink-0 border border-[#e2eef2] shadow-[0_1px_2px_rgba(15,80,100,0.03),0_8px_24px_-12px_rgba(15,80,100,0.12)]">
      <div className="flex items-center justify-between mb-3">
        <span className="text-[10px] tracking-[0.18em] font-bold text-[#7c95a0]">DIFFICULTY</span>
        <span className={`text-[10px] font-semibold ${phaseTone}`}>{phase}</span>
      </div>

      {/* Difficulty segmented */}
      <div className="flex gap-[2px] bg-[#0b3a45]/[0.06] p-1 rounded-[14px] mb-5">
        {(Object.keys(PRESETS) as PresetId[]).map((id) => {
          const active = preset === id;
          return (
            <button
              key={id}
              onClick={() => handlePreset(id)}
              className={`flex-1 py-2 rounded-[11px] flex flex-col items-center gap-[2px] text-xs transition-all cursor-pointer ${
                active
                  ? "bg-white text-[#0e6a7b] font-bold shadow-[0_2px_6px_rgba(11,58,69,0.1)]"
                  : "text-[#5d7a85] font-medium"
              }`}
            >
              <span className={`text-lg leading-none ${active ? "" : "grayscale-[0.5]"}`}>
                {PRESETS[id].icon}
              </span>
              <span>{PRESETS[id].label}</span>
            </button>
          );
        })}
      </div>

      {/* Fleet composition */}
      <div className="text-[10px] tracking-[0.18em] font-bold text-[#7c95a0] mb-2">
        FLEET COMPOSITION
      </div>
      <div className="flex flex-col gap-3">
        <SliderField
          label="🛰  スカウト機数"
          value={config.scout_count}
          min={1}
          max={6}
          onChange={(v) => handleNumber("scout_count", v)}
        />
        <SliderField
          label="🤿  コレクター機数"
          value={config.collector_count}
          min={1}
          max={6}
          onChange={(v) => handleNumber("collector_count", v)}
        />
        <SliderField
          label="⏱  ステップ数"
          value={config.steps}
          min={200}
          max={2000}
          step={50}
          unit="t"
          onChange={(v) => handleNumber("steps", v)}
        />
      </div>

      {/* Manual control toggle */}
      <label className="flex items-center justify-between mt-4 px-3 py-2.5 bg-[#f4fafc] rounded-xl cursor-pointer">
        <span className="text-[13px] text-[#345461] font-medium">手動操作モード</span>
        <button
          type="button"
          onClick={() =>
            handleToggle("enable_manual_robot", !config.enable_manual_robot)
          }
          className="relative w-9 h-5 rounded-full transition-colors shrink-0"
          style={{
            backgroundColor: config.enable_manual_robot ? "#0e6a7b" : "#cdd9de",
          }}
        >
          <span
            className="absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-[left]"
            style={{ left: config.enable_manual_robot ? 18 : 2 }}
          />
        </button>
      </label>

      {/* Actions */}
      {!connected ? (
        <button
          onClick={async () => {
            await onReset(config);
            onConnect();
          }}
          className="block w-full mt-4 py-3.5 rounded-2xl border-0 text-white text-sm font-bold tracking-wide cursor-pointer shadow-[0_8px_20px_-8px_rgba(224,138,91,0.55)]"
          style={{
            background:
              "linear-gradient(95deg, #e08a5b 0%, #e89a4a 100%)",
          }}
        >
          🚀 シミュレーション開始
        </button>
      ) : (
        <button
          onClick={onDisconnect}
          className="block w-full mt-4 py-3.5 rounded-2xl border-0 text-white text-sm font-bold tracking-wide cursor-pointer shadow-[0_8px_20px_-8px_rgba(208,90,79,0.45)]"
          style={{
            background:
              "linear-gradient(95deg, #d05a4f 0%, #e07a6a 100%)",
          }}
        >
          ⏹  停止
        </button>
      )}

      <button
        onClick={() => onReset(config)}
        className="block w-full mt-2 py-2.5 rounded-xl border border-[#d9e8ec] bg-transparent text-[#5d7a85] text-xs cursor-pointer hover:bg-[#f4fafc] transition-colors"
      >
        リセット
      </button>
    </div>
  );
}

interface SliderFieldProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  onChange: (value: number) => void;
}

/**
 * Render a labeled range slider with the current value chip on the right.
 *
 * @param props Slider props.
 * @returns Slider row UI.
 */
function SliderField({
  label,
  value,
  min,
  max,
  step = 1,
  unit = "",
  onChange,
}: SliderFieldProps) {
  return (
    <label className="block">
      <div className="flex justify-between items-baseline mb-1.5">
        <span className="text-[13px] text-[#345461] font-medium">{label}</span>
        <span className="text-[11px] font-semibold text-[#0e6a7b] bg-[#0e6a7b]/10 px-2 py-0.5 rounded-full tabular-nums">
          {value}
          {unit}
        </span>
      </div>
      <input
        type="range"
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full cursor-pointer"
        style={{ accentColor: "#0e6a7b" }}
      />
    </label>
  );
}
