import { useEffect, useRef, useState } from "react";
import Canvas from "./components/Canvas";
import Canvas3D, { type CameraPreset } from "./components/Canvas3D";
import ControlPanel from "./components/ControlPanel";
import StatsPanel from "./components/StatsPanel";
import useSimulation from "./hooks/useSimulation";

const MOVEMENT_KEYS = new Set([
  "w",
  "a",
  "s",
  "d",
  "arrowup",
  "arrowdown",
  "arrowleft",
  "arrowright",
]);

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
    manualMove,
  } = useSimulation();

  const keysPressed = useRef(new Set<string>());
  const lastDir = useRef({ dx: 0, dy: 0 });
  const [view, setView] = useState<"2d" | "3d">("3d");
  const [cameraPreset, setCameraPreset] = useState<CameraPreset>("angle");

  useEffect(() => {
    if (!connected || config.enable_manual_robot === false) return;

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
      if (MOVEMENT_KEYS.has(key)) {
        e.preventDefault();
        keysPressed.current.add(key);
        updateMovement();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      if (MOVEMENT_KEYS.has(key)) {
        e.preventDefault();
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
  }, [connected, config.enable_manual_robot, manualMove]);

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
    <div className="min-h-screen bg-[#020817] text-slate-50 p-4">
      <div className="max-w-[1540px] mx-auto">
        <div className="mb-4">
          <h1 className="text-2xl font-bold tracking-tight text-cyan-200">
            海洋清掃ロボット シミュレーション
          </h1>
          <p className="text-slate-400 mt-1 max-w-3xl text-sm leading-7">
            スカウトロボットが海に漂うごみを見つけ、コレクターロボットがそれを基地まで運びます。
            魚たちは群れで泳ぎながらロボットを避け、ときどき近くに流れてきたごみを食べてしまいます。
          </p>
        </div>

        <div className="flex flex-col lg:flex-row gap-4 items-start">
          <ControlPanel
            connected={connected}
            config={config}
            phase={phase}
            onConnect={connect}
            onDisconnect={disconnect}
            onReset={handleReset}
          />
          <div className="flex-1 min-w-0 flex flex-col items-center gap-2">
            <div className="flex flex-wrap gap-2 self-end items-center">
              {view === "3d" && (
                <div className="flex gap-1 mr-2">
                  {(
                    [
                      { id: "angle", label: "斜め" },
                      { id: "top", label: "俯瞰" },
                      { id: "side", label: "真横" },
                      { id: "low", label: "低角度" },
                    ] as { id: CameraPreset; label: string }[]
                  ).map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setCameraPreset(p.id)}
                      className={`px-2 py-1 rounded-md text-xs font-medium border ${
                        cameraPreset === p.id
                          ? "bg-cyan-500 text-slate-900 border-cyan-300"
                          : "bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700"
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              )}
              <button
                type="button"
                onClick={() => setView("2d")}
                className={`px-3 py-1 rounded-md text-xs font-medium border ${
                  view === "2d"
                    ? "bg-cyan-500 text-slate-900 border-cyan-300"
                    : "bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700"
                }`}
              >
                2D
              </button>
              <button
                type="button"
                onClick={() => setView("3d")}
                className={`px-3 py-1 rounded-md text-xs font-medium border ${
                  view === "3d"
                    ? "bg-cyan-500 text-slate-900 border-cyan-300"
                    : "bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700"
                }`}
              >
                3D
              </button>
            </div>
            {view === "3d" ? (
              <Canvas3D
                agents={agents}
                base={base}
                width={config.width}
                height={config.height}
                cameraPreset={cameraPreset}
              />
            ) : (
              <Canvas
                agents={agents}
                base={base}
                width={config.width}
                height={config.height}
              />
            )}
          </div>
          <StatsPanel
            stats={stats}
            score={score}
            tick={tick}
            phase={phase}
            totalSteps={config.steps}
          />
        </div>
      </div>
    </div>
  );
}
