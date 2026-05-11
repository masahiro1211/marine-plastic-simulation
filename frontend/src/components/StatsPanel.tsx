import type { ScoreState, SimulationPhase, SimulationStats } from "../types";

interface StatsPanelProps {
  stats: SimulationStats;
  score: ScoreState;
  tick: number;
  phase: SimulationPhase;
  totalSteps: number;
}

const PHASE_LABEL: Record<SimulationPhase, string> = {
  idle: "Ready",
  running: "Running",
  stopped: "Stopped",
  completed: "Finished",
};

const PHASE_TONE: Record<SimulationPhase, string> = {
  idle: "text-slate-300",
  running: "text-emerald-300",
  stopped: "text-rose-300",
  completed: "text-amber-300",
};

/**
 * Render a labeled progress bar with an "N / M" counter under it.
 *
 * @param props Progress bar props.
 * @returns Progress bar UI.
 */
function ProgressBar({
  label,
  current,
  total,
}: {
  label: string;
  current: number;
  total: number;
}) {
  const safeTotal = total > 0 ? total : 1;
  const ratio = Math.max(0, Math.min(1, current / safeTotal));
  return (
    <div>
      <div className="flex justify-between text-xs text-slate-400 mb-1">
        <span>{label}</span>
        <span>
          {current} / {total}
        </span>
      </div>
      <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
        <div
          className="h-full bg-cyan-400 transition-[width] duration-200"
          style={{ width: `${ratio * 100}%` }}
        />
      </div>
    </div>
  );
}

/**
 * Render a counter row with a friendly label and large numeric value.
 *
 * @param props Counter row props.
 * @returns Counter row UI.
 */
function Counter({
  label,
  value,
  tone = "text-slate-100",
}: {
  label: string;
  value: number;
  tone?: string;
}) {
  return (
    <div className="flex justify-between items-baseline">
      <span className="text-sm text-slate-400">{label}</span>
      <span className={`text-xl font-semibold ${tone}`}>{value}</span>
    </div>
  );
}

/**
 * Render the simplified, student-facing mission HUD.
 *
 * @param props Component props.
 * @returns Status panel UI.
 */
export default function StatsPanel({
  stats,
  score,
  tick,
  phase,
  totalSteps,
}: StatsPanelProps) {
  const cappedTick = Math.min(tick, totalSteps);

  return (
    <div className="bg-slate-950/80 text-white p-5 rounded-2xl min-w-[260px] shadow-xl border border-cyan-900/50 space-y-5">
      <div>
        <div className="text-[11px] uppercase tracking-[0.2em] text-slate-500">
          Score
        </div>
        <div className="text-5xl font-bold text-amber-300 leading-tight mt-1">
          {Math.round(score.total).toLocaleString()}
        </div>
        <div className="mt-2 text-xs text-slate-400 space-y-0.5">
          <div>
            <span className="text-lime-300">+12</span> per trash collected
          </div>
          <div>
            <span className="text-rose-300">−2</span> per robot crash
          </div>
          <div>
            <span className="text-teal-300">+1</span> per ~20 energy left
          </div>
        </div>
      </div>

      <div className="border-t border-slate-800 pt-4">
        <ProgressBar
          label="Time"
          current={cappedTick}
          total={totalSteps}
        />
      </div>

      <div className="border-t border-slate-800 pt-4 space-y-3">
        <Counter
          label="Trash Collected"
          value={stats.delivered_trash}
          tone="text-lime-300"
        />
        <Counter
          label="Robot Crashes"
          value={score.collisions}
          tone="text-rose-300"
        />
      </div>

      <div className="border-t border-slate-800 pt-3 flex justify-between text-sm">
        <span className="text-slate-400">Status</span>
        <span className={PHASE_TONE[phase]}>{PHASE_LABEL[phase]}</span>
      </div>
    </div>
  );
}
