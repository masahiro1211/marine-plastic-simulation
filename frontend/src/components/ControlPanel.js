import React, { useState } from "react";

const DEFAULT_CONFIG = {
  width: 800,
  height: 600,
  num_fish: 50,
  num_predators: 5,
  num_plastics: 30,
  fish_speed: 2.0,
  predator_speed: 1.5,
  plastic_drift_speed: 0.3,
  tick_interval_ms: 50,
};

const FIELDS = [
  ["num_fish", "Fish Count"],
  ["num_predators", "Predator Count"],
  ["num_plastics", "Plastic Count"],
  ["fish_speed", "Fish Speed"],
  ["predator_speed", "Predator Speed"],
  ["plastic_drift_speed", "Drift Speed"],
  ["tick_interval_ms", "Tick (ms)"],
];

export default function ControlPanel({
  connected,
  onConnect,
  onDisconnect,
  onReset,
}) {
  const [config, setConfig] = useState(DEFAULT_CONFIG);

  const handleChange = (key, value) => {
    setConfig((prev) => ({ ...prev, [key]: Number(value) }));
  };

  return (
    <div className="bg-black/60 text-white p-4 rounded-lg min-w-[180px]">
      <h3 className="text-base font-semibold mb-3">Controls</h3>

      {!connected ? (
        <button
          className="block w-full py-2 mb-2 rounded bg-blue-800 hover:bg-blue-700 text-white text-sm cursor-pointer"
          onClick={onConnect}
        >
          Start
        </button>
      ) : (
        <button
          className="block w-full py-2 mb-2 rounded bg-red-800 hover:bg-red-700 text-white text-sm cursor-pointer"
          onClick={onDisconnect}
        >
          Stop
        </button>
      )}

      <button
        className="block w-full py-2 mb-2 rounded bg-green-800 hover:bg-green-700 text-white text-sm cursor-pointer"
        onClick={() => onReset(config)}
      >
        Reset
      </button>

      <hr className="border-gray-600 my-3" />

      {FIELDS.map(([key, label]) => (
        <label key={key} className="block text-xs mb-2">
          {label}
          <input
            type="number"
            value={config[key]}
            onChange={(e) => handleChange(key, e.target.value)}
            className="block w-full p-1 mt-0.5 rounded border border-gray-600 bg-gray-900 text-white text-xs"
          />
        </label>
      ))}
    </div>
  );
}
