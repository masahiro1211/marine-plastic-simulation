import React from "react";

export default function StatsPanel({ stats, tick }) {
  return (
    <div style={styles.panel}>
      <h3 style={styles.title}>Statistics</h3>
      <div style={styles.row}>
        <span style={{ color: "#4fc3f7" }}>Fish:</span> {stats.fish}
      </div>
      <div style={styles.row}>
        <span style={{ color: "#ef5350" }}>Predators:</span> {stats.predators}
      </div>
      <div style={styles.row}>
        <span style={{ color: "#a1887f" }}>Plastics:</span> {stats.plastics}
      </div>
      <div style={styles.row}>Tick: {tick}</div>
    </div>
  );
}

const styles = {
  panel: {
    background: "rgba(0,0,0,0.6)",
    color: "#fff",
    padding: 16,
    borderRadius: 8,
    minWidth: 160,
  },
  title: { margin: "0 0 8px 0", fontSize: 16 },
  row: { marginBottom: 4, fontSize: 14 },
};
