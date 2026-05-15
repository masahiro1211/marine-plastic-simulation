import { useCallback, useEffect, useRef, useState } from "react";
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
  idle: "text-slate-500",
  running: "text-emerald-600",
  stopped: "text-rose-600",
  completed: "text-amber-600",
};

const RANK_TIERS = ["ヤドカリ", "クマノミ", "ウミガメ", "イルカ", "シャチ"];
const CLEAR_SCORE = 1000;
const UPGRADE_SCORE = 500;
const RANK_STEP = CLEAR_SCORE / RANK_TIERS.length;

interface DeltaItem {
  id: number;
  value: number;
}

/**
 * Render a small "+100" / "−20" burst that floats up from the top of the score
 * card whenever the total score changes.
 *
 * @param props Component props.
 * @returns Floating-delta layer UI.
 */
function FloatingDeltas({
  items,
  onDone,
}: {
  items: DeltaItem[];
  onDone: (id: number) => void;
}) {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      <style>{`
        @keyframes reef-float {
          0% { transform: translate(-50%, 8px); opacity: 0; }
          15% { opacity: 1; }
          100% { transform: translate(-50%, -48px); opacity: 0; }
        }
      `}</style>
      {items.map((it) => (
        <div
          key={it.id}
          onAnimationEnd={() => onDone(it.id)}
          className="absolute left-1/2 top-3 font-bold text-2xl tabular-nums"
          style={{
            color: it.value > 0 ? "#1a9a7e" : "#d05a4f",
            transform: "translate(-50%, 0)",
            animation: "reef-float 1.5s cubic-bezier(.2,.7,.2,1) forwards",
            textShadow: "0 1px 0 rgba(255,255,255,0.7)",
          }}
        >
          {it.value > 0 ? `+${it.value}` : it.value}
        </div>
      ))}
    </div>
  );
}

/**
 * Render a counter row with optional /total progress bar underneath.
 *
 * @param props Stat row props.
 * @returns Stat row UI.
 */
function StatRow({
  label,
  value,
  total,
  accent,
  reverse,
}: {
  label: string;
  value: number;
  total?: number;
  accent: string;
  reverse?: boolean;
}) {
  const ratio = total ? value / total : null;
  return (
    <div>
      <div className="flex justify-between items-baseline mb-1">
        <span className="text-[13px] text-[#5d7a85]">{label}</span>
        <span className="tabular-nums font-semibold" style={{ color: accent }}>
          <span className="text-[22px]">{value}</span>
          {total != null && (
            <span className="text-[11px] text-[#7c95a0]"> / {total}</span>
          )}
        </span>
      </div>
      {ratio != null && (
        <div className="h-1 rounded-full bg-[#e8f1f4] overflow-hidden">
          <div
            className="h-full rounded-full"
            style={{
              width: `${Math.max(0, Math.min(1, reverse ? 1 - ratio : ratio)) * 100}%`,
              background: accent,
            }}
          />
        </div>
      )}
    </div>
  );
}

/**
 * Render the Reef Patrol HUD — total score with rank, live stats, and time
 * progress. Props match the original StatsPanel so this drops into App.tsx
 * unchanged.
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
  const totalScore = Math.round(score.total);

  // Floating score deltas — driven by the live total-score delta. We keep a
  // sliding window in state and let each entry self-expire after 1.5s.
  const [deltas, setDeltas] = useState<DeltaItem[]>([]);
  const lastScoreRef = useRef<number>(totalScore);
  const idRef = useRef<number>(0);

  useEffect(() => {
    const prev = lastScoreRef.current;
    lastScoreRef.current = totalScore;
    const diff = totalScore - prev;
    if (!diff) return;
    const id = ++idRef.current;
    setDeltas((xs) => [...xs, { id, value: diff }]);
  }, [totalScore]);

  const removeDelta = useCallback(
    (id: number) => setDeltas((xs) => xs.filter((x) => x.id !== id)),
    []
  );

  // Rank: 5-tier progression based on accumulated score.
  const filled = Math.max(0, Math.min(5, Math.floor(totalScore / RANK_STEP)));
  const rankIdx = Math.max(0, Math.min(RANK_TIERS.length - 1, filled - 1));
  const rankName = filled === 0 ? "—" : RANK_TIERS[rankIdx];

  const card =
    "bg-white border border-[#e2eef2] rounded-2xl shadow-[0_1px_2px_rgba(15,80,100,0.03),0_8px_24px_-12px_rgba(15,80,100,0.12)]";

  return (
    <div className="text-[#1a3744] w-[256px] shrink-0 flex flex-col gap-3">
      {/* Score + rank */}
      <div className={`${card} p-5 relative overflow-hidden`}>
        <FloatingDeltas items={deltas} onDone={removeDelta} />
        <div className="text-[10px] tracking-[0.18em] font-bold text-[#7c95a0]">SCORE</div>
        <div className="text-[60px] font-bold text-[#0e6a7b] leading-none mt-1.5 tabular-nums tracking-[-0.03em]">
          {totalScore.toLocaleString()}
        </div>

        {/* Rank — 5 bars + sea-creature tier */}
        <div className="mt-4">
          <div className="flex gap-1.5">
            {Array.from({ length: 5 }).map((_, i) => (
              <span
                key={i}
                className="flex-1 h-[5px] rounded-full"
                style={{ background: i < filled ? "#e8b340" : "#f3e6cc" }}
              />
            ))}
          </div>
          <div className="flex justify-between items-center mt-2">
            <span className="text-[10px] tracking-[0.18em] font-bold text-[#7c95a0]">
              RANK
            </span>
            <span className="text-[13px] font-bold text-[#b58a32] inline-flex items-center gap-1">
              <span className="text-[#e8b340]">{"★".repeat(filled) || "☆"}</span>
              <span>{rankName}</span>
            </span>
          </div>
        </div>

        {/* Score legend */}
        <div className="flex gap-3 mt-3 pt-3 border-t border-[#eef4f6] text-[11px] text-[#5d7a85]">
          <div>
            <span className="text-[#1a9a7e] font-bold">+100</span>
            <span className="ml-1">回収</span>
          </div>
          <div>
            <span className="text-[#d05a4f] font-bold">−20</span>
            <span className="ml-1">衝突</span>
          </div>
        </div>
        <div className="mt-3 text-[11px] text-[#5d7a85] leading-relaxed">
          <span className="font-bold text-[#0e6a7b]">{UPGRADE_SCORE}</span>
          <span className="ml-1">で高速化・2個積載、</span>
          <span className="font-bold text-[#0e6a7b]">{CLEAR_SCORE}</span>
          <span className="ml-1">でクリア</span>
        </div>
      </div>

      {/* Live stats */}
      <div className={`${card} p-5`}>
        <div className="text-[10px] tracking-[0.18em] font-bold text-[#7c95a0] mb-3">
          LIVE STATS
        </div>
        <div className="flex flex-col gap-3">
          <StatRow
            label="回収済みごみ"
            value={stats.delivered_trash}
            accent="#1a9a7e"
          />
          <StatRow
            label="残りごみ"
            value={stats.trash_remaining}
            accent="#0e6a7b"
          />
          <StatRow
            label="ロボット衝突"
            value={score.collisions}
            accent="#d05a4f"
          />
        </div>
      </div>

      {/* Progress + phase */}
      <div className={`${card} px-4 py-3`}>
        <div className="flex justify-between text-[11px] mb-2">
          <span className="text-[#5d7a85]">経過時間</span>
          <span className="text-[#1a3744] font-semibold tabular-nums">
            {cappedTick} / {totalSteps}
          </span>
        </div>
        <div className="h-1.5 rounded-full bg-[#e8f1f4] overflow-hidden">
          <div
            className="h-full rounded-full transition-[width] duration-200"
            style={{
              width: `${(cappedTick / Math.max(1, totalSteps)) * 100}%`,
              background: "linear-gradient(90deg, #5fb3c4, #0e6a7b)",
            }}
          />
        </div>
        <div className="flex justify-between mt-2 text-[11px]">
          <span className="text-[#7c95a0]">Status</span>
          <span className={`font-semibold ${PHASE_TONE[phase]}`}>
            {PHASE_LABEL[phase]}
          </span>
        </div>
      </div>
    </div>
  );
}
