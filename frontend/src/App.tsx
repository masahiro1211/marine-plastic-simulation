import { useEffect, useRef } from "react";
import Canvas from "./components/Canvas";
import ControlPanel from "./components/ControlPanel";
import StatsPanel from "./components/StatsPanel";
import useSimulation from "./hooks/useSimulation";

/**
 * Render the main simulation dashboard.
 *
 * @returns Root application layout.
 */
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
    // ここから1行追加
    manualMove,
  } = useSimulation();
  // ここから追加（キーボード処理）
  const keysPressed = useRef(new Set<string>());
  const lastDir = useRef({ dx: 0, dy: 0 });

  useEffect(() => {
    if (!connected) return;

    const updateMovement = () => {
      let dx = 0;
      let dy = 0;
      const keys = keysPressed.current;

      if (keys.has("w") || keys.has("arrowup")) dy -= 1;
      if (keys.has("s") || keys.has("arrowdown")) dy += 1;
      if (keys.has("a") || keys.has("arrowleft")) dx -= 1;
      if (keys.has("d") || keys.has("arrowright")) dx += 1;

      if (dx !== lastDir.current.dx || dy !== lastDir.current.dy) {
        lastDir.current = { dx, dy };
        manualMove(dx, dy);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      if (["w", "a", "s", "d", "arrowup", "arrowdown", "arrowleft", "arrowright"].includes(key)) {
        keysPressed.current.add(key);
        updateMovement();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      if (["w", "a", "s", "d", "arrowup", "arrowdown", "arrowleft", "arrowright"].includes(key)) {
        keysPressed.current.delete(key);
        updateMovement();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      manualMove(0, 0);
      keysPressed.current.clear();
      lastDir.current = { dx: 0, dy: 0 };
    };
  }, [connected, manualMove]);
  // ここまで追加
  /**
   * Reset the simulation through WebSocket when connected and through REST otherwise.
   *
   * @param nextConfig New configuration to apply.
   */
  const handleReset = (nextConfig: typeof config) => {
    if (connected) {
      reset(nextConfig);
      return;
    }
    void resetViaApi(nextConfig);
  };

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
