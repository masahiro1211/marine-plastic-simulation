import React from "react";

export default function StatsPanel({ stats, tick }) {
  return (
    <div className="bg-black/60 text-white p-4 rounded-lg min-w-[160px]">
      <h3 className="text-base font-semibold mb-2">Statistics</h3>
      <div className="text-sm mb-1">
        <span className="text-fish">Fish:</span> {stats.fish}
      </div>
      <div className="text-sm mb-1">
        <span className="text-predator">Predators:</span> {stats.predators}
      </div>
      <div className="text-sm mb-1">
        <span className="text-plastic">Plastics:</span> {stats.plastics}
      </div>
      <div className="text-sm">Tick: {tick}</div>
    </div>
  );
}
