import React, { useEffect, useState } from "react";

const DEFAULT_CONFIG = {
  width: 960,
  height: 640,
  steps: 600,
  tick_interval_ms: 50,
  scout_count: 2,
  collector_count: 3,
  marine_life_count: 10,
  initial_trash_count: 18,
};

const FIELDS = [
  ["steps", "Steps"],
  ["scout_count", "Scout Robots"],
  ["collector_count", "Collector Robots"],
  ["marine_life_count", "Marine Life"],
  ["initial_trash_count", "Initial Trash"],
];

export default function ControlPanel({
  connected,
  config: incomingConfig,
  phase,
  onConnect,
  onDisconnect,
  onReset,
}) {
  const [config, setConfig] = useState(DEFAULT_CONFIG);

  useEffect(() => {
    if (incomingConfig) {
      setConfig((prev) => ({ ...prev, ...incomingConfig }));
    }
  }, [incomingConfig]);

  const handleChange = (key, value) => {
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
              onChange={(e) => handleChange(key, e.target.value)}
              className="block w-full p-2 mt-1 rounded-lg border border-slate-700 bg-slate-900 text-white text-sm"
            />
          </label>
        ))}
      </div>
    </div>
  );
}
