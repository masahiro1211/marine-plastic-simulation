import { useEffect } from "react"; // 追加
import Canvas from "./components/Canvas";
import ControlPanel from "./components/ControlPanel";
import StatsPanel from "./components/StatsPanel";
import useSimulation from "./hooks/useSimulation";

export default function App() {
  const {
    agents,
    stats,
    score,
    config,
    base,
    tick,
    phase,
    connected,
    connect,
    disconnect,
    reset,
    resetViaApi,
    sendManualMove, // 追加: useSimulationから手動操作用の送信関数を受け取る
  } = useSimulation();

  const handleReset = (nextConfig: typeof config) => {
    if (connected) {
      reset(nextConfig);
      return;
    }
    void resetViaApi(nextConfig);
  };
// 追加開始: キーボード入力の監視とバックエンドへの送信 
useEffect(() => {
  // シミュレーションが接続されていない、または送信関数がまだ無い場合は何もしない
  if (!connected || !sendManualMove) return;

  const handleKeyDown = (e: KeyboardEvent) => {
    let vx = 0;
    let vy = 0;

    // 矢印キー（またはWASD）の入力を判定してベクトルを作る
    if (e.key === "ArrowUp" || e.key === "w") vy = -1.0;
    if (e.key === "ArrowDown" || e.key === "s") vy = 1.0;
    if (e.key === "ArrowLeft" || e.key === "a") vx = -1.0;
    if (e.key === "ArrowRight" || e.key === "d") vx = 1.0;

    // 矢印かWASDが押されたら、その方向のベクトルを送信する
    if (vx !== 0 || vy !== 0) {
      sendManualMove(vx, vy);
    }
  };

  const handleKeyUp = (e: KeyboardEvent) => {
    // キーを離した時はロボットを止めるために(0, 0)を送信する
    if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "w", "a", "s", "d"].includes(e.key)) {
      sendManualMove(0.0, 0.0);
    }
  };

  window.addEventListener("keydown", handleKeyDown);
  window.addEventListener("keyup", handleKeyUp);

  // クリーンアップ関数（コンポーネントが再描画される時に監視をリセット）
  return () => {
    window.removeEventListener("keydown", handleKeyDown);
    window.removeEventListener("keyup", handleKeyUp);
  };
}, [connected, sendManualMove]);
//追加終了
  return (
    <div className="min-h-screen bg-[#020817] text-slate-50 p-6">
      <div className="max-w-[1540px] mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold tracking-tight text-cyan-200">
            Marine Cleanup Robot Simulation
          </h1>
          <p className="text-slate-400 mt-2 max-w-3xl text-sm leading-6">
            Scout robots discover drifting trash, collectors return it to the
            base, and marine life stress rises when robots crowd the habitat.
          </p>
        </div>

        <div className="flex flex-col xl:flex-row gap-5 items-start">
          <ControlPanel
            connected={connected}
            config={config}
            phase={phase}
            onConnect={connect}
            onDisconnect={disconnect}
            onReset={handleReset}
          />
          <Canvas
            agents={agents}
            base={base}
            width={config.width}
            height={config.height}
          />
          <StatsPanel stats={stats} score={score} tick={tick} phase={phase} />
        </div>
      </div>
    </div>
  );
}
