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
    <div style={styles.panel}>
      <h3 style={styles.title}>Controls</h3>

      {!connected ? (
        <button style={styles.btn} onClick={onConnect}>
          Start
        </button>
      ) : (
        <button style={{ ...styles.btn, background: "#c62828" }} onClick={onDisconnect}>
          Stop
        </button>
      )}

      <button
        style={{ ...styles.btn, background: "#2e7d32" }}
        onClick={() => onReset(config)}
      >
        Reset
      </button>

      <hr style={{ borderColor: "#555", margin: "12px 0" }} />

      {[
        ["num_fish", "Fish Count"],
        ["num_predators", "Predator Count"],
        ["num_plastics", "Plastic Count"],
        ["fish_speed", "Fish Speed"],
        ["predator_speed", "Predator Speed"],
        ["plastic_drift_speed", "Drift Speed"],
        ["tick_interval_ms", "Tick (ms)"],
      ].map(([key, label]) => (
        <label key={key} style={styles.label}>
          {label}
          <input
            type="number"
            value={config[key]}
            onChange={(e) => handleChange(key, e.target.value)}
            style={styles.input}
          />
        </label>
      ))}
    </div>
  );
}

const styles = {
  panel: {
    background: "rgba(0,0,0,0.6)",
    color: "#fff",
    padding: 16,
    borderRadius: 8,
    minWidth: 180,
  },
  title: { margin: "0 0 12px 0", fontSize: 16 },
  btn: {
    display: "block",
    width: "100%",
    padding: "8px 0",
    marginBottom: 8,
    border: "none",
    borderRadius: 4,
    background: "#1565c0",
    color: "#fff",
    fontSize: 14,
    cursor: "pointer",
  },
  label: {
    display: "block",
    fontSize: 12,
    marginBottom: 8,
  },
  input: {
    display: "block",
    width: "100%",
    padding: 4,
    marginTop: 2,
    borderRadius: 4,
    border: "1px solid #555",
    background: "#222",
    color: "#fff",
  },
};
