import type { ScoreState, SimulationPhase, SimulationStats } from "../types";

interface MetricProps {
  label: string;
  value: number | string;
  tone?: string;
}

function Metric({ label, value, tone = "text-slate-200" }: MetricProps) {
  return (
    <div className="flex justify-between gap-3 text-sm">
      <span className="text-slate-400">{label}</span>
      <span className={tone}>{value}</span>
    </div>
  );
}

interface StatsPanelProps {
  stats: SimulationStats;
  score: ScoreState;
  tick: number;
  phase: SimulationPhase;
}

export default function StatsPanel({
  stats,
  score,
  tick,
  phase,
}: StatsPanelProps) {
  return (
    <div className="bg-slate-950/80 text-white p-4 rounded-2xl min-w-[240px] shadow-xl border border-cyan-900/50">
      <h3 className="text-base font-semibold mb-3">Mission Status</h3>

      <div className="space-y-1 mb-4">
        <Metric label="Phase" value={phase} tone="text-cyan-300" />
        <Metric label="Tick" value={tick} />
        <Metric label="Total Score" value={score.total} tone="text-amber-300" />
      </div>

      <div className="border-t border-slate-800 pt-3 space-y-1 mb-4">
        <Metric label="Scouts" value={stats.scouts} tone="text-cyan-300" />
        <Metric label="Collectors" value={stats.collectors} tone="text-emerald-300" />
        <Metric label="Marine Life" value={stats.marine_life} tone="text-sky-300" />
        <Metric label="Trash Remaining" value={stats.trash_remaining} tone="text-orange-300" />
        <Metric label="Delivered Trash" value={stats.delivered_trash} tone="text-lime-300" />
      </div>

      <div className="border-t border-slate-800 pt-3 space-y-1">
        <Metric label="Active Robots" value={stats.active_robots} />
        <Metric label="Collisions" value={score.collisions} tone="text-rose-300" />
        <Metric label="Stress" value={score.marine_life_stress} tone="text-fuchsia-300" />
        <Metric label="Energy Left" value={score.energy_remaining} tone="text-teal-300" />
      </div>
    </div>
  );
}
