import { useEffect, useState } from "react";
import { DEFAULT_SIMULATION_CONFIG } from "../config/defaultSimulationConfig";
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

interface ControlPanelProps {
  connected: boolean;
  config: SimulationConfig;
  phase: SimulationPhase;
  onConnect: () => void;
  onDisconnect: () => void;
  onReset: (nextConfig: SimulationConfig) => void | Promise<void>;
}

/**
 * Render Reef Patrol mission controls — fleet composition, manual-control
 * toggle, and start/reset actions. The panel keeps the same external props
 * as before so it can drop into App.tsx with no other changes.
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
  const [config, setConfig] = useState<SimulationConfig>(DEFAULT_SIMULATION_CONFIG);

  useEffect(() => {
    setConfig((prev) => ({ ...prev, ...incomingConfig }));
  }, [incomingConfig]);

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
        <span className="text-[10px] tracking-[0.18em] font-bold text-[#7c95a0]">SETUP</span>
        <span className={`text-[10px] font-semibold ${phaseTone}`}>{phase}</span>
      </div>

      {/* Intro */}
      <p className="text-[12px] text-[#345461] leading-[1.55] bg-[#f4fafc] rounded-xl px-3 py-2.5 mb-5">
        パラメータを変えて、色んな状況でシミュレーションしてみよう。
      </p>

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
