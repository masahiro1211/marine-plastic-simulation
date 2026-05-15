import { lazy, Suspense, useCallback, useEffect, useRef, useState } from "react";
import type { CameraPreset } from "./components/Canvas3D";
import ControlPanel, { GAMEPAD_CONTROL_COUNT } from "./components/ControlPanel";
import StatsPanel from "./components/StatsPanel";
import useSimulation from "./hooks/useSimulation";
import type { SimulationConfig } from "./types";

const Canvas = lazy(() => import("./components/Canvas"));
const Canvas3D = lazy(() => import("./components/Canvas3D"));

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

const GAMEPAD_AXIS_DEADZONE = 0.18;
const GAMEPAD_DIRECTION_REPEAT_MS = 150;

function getActiveGamepad(): Gamepad | null {
  const pads = navigator.getGamepads?.();
  if (!pads) return null;

  const livePads = Array.from(pads).filter(
    (pad): pad is Gamepad => pad !== null,
  );
  if (livePads.length === 0) return null;

  return livePads.find((pad) => pad.connected) ?? livePads[0];
}

/**
 * Render the main simulation dashboard. Center Canvas, agent logic, and
 * keyboard handling are intentionally unchanged from the previous version;
 * only the surrounding chrome is re-skinned to the Reef Patrol theme.
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
    discoveredTrashIds,
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
  const [panelConfig, setPanelConfig] = useState<SimulationConfig>(config);
  const panelConfigRef = useRef(panelConfig);
  const connectedRef = useRef(connected);
  const configRef = useRef(config);
  const gamepadButtonsRef = useRef({ a: false, b: false });
  const gamepadRepeatRef = useRef({
    lastVerticalAt: 0,
    lastHorizontalAt: 0,
    vertical: 0,
    horizontal: 0,
  });
  const gamepadIdRef = useRef<string | null>(null);
  const gamepadLastMoveRef = useRef({ dx: 0, dy: 0 });
  const [gamepadPanelMode, setGamepadPanelMode] = useState(false);
  const gamepadPanelModeRef = useRef(false);
  const [gamepadSelectedIndex, setGamepadSelectedIndex] = useState(0);
  const [gamepadAdjustment, setGamepadAdjustment] = useState<{
    nonce: number;
    direction: -1 | 1;
  } | null>(null);
  const [view, setView] = useState<"2d" | "3d">("3d");
  const [cameraPreset, setCameraPreset] = useState<CameraPreset>("angle");

  useEffect(() => {
    setPanelConfig(config);
  }, [config]);

  useEffect(() => {
    panelConfigRef.current = panelConfig;
  }, [panelConfig]);

  useEffect(() => {
    connectedRef.current = connected;
  }, [connected]);

  useEffect(() => {
    configRef.current = config;
  }, [config]);

  useEffect(() => {
    gamepadPanelModeRef.current = gamepadPanelMode;
  }, [gamepadPanelMode]);

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
  const handleReset = useCallback(async (nextConfig: typeof config): Promise<void> => {
    if (connected) {
      reset(nextConfig);
      return;
    }
    await resetViaApi(nextConfig);
  }, [connected, reset, resetViaApi]);

  useEffect(() => {
    let frameId = 0;

    const normalizeAxis = (value: number | undefined): number => {
      const axis = value ?? 0;
      return Math.abs(axis) < GAMEPAD_AXIS_DEADZONE ? 0 : axis;
    };

    const emitRobotMove = (dx: number, dy: number) => {
      const roundedDx = Number(dx.toFixed(2));
      const roundedDy = Number(dy.toFixed(2));
      const last = gamepadLastMoveRef.current;
      if (Math.abs(roundedDx - last.dx) < 0.04 && Math.abs(roundedDy - last.dy) < 0.04) {
        return;
      }
      gamepadLastMoveRef.current = { dx: roundedDx, dy: roundedDy };
      manualMove(roundedDx, roundedDy);
    };

    const toggleSimulation = () => {
      if (connectedRef.current) {
        disconnect();
        return;
      }
      void handleReset(panelConfigRef.current).then(() => connect());
    };

    const pollGamepad = () => {
      const gamepad = getActiveGamepad();
      if (gamepad?.id !== gamepadIdRef.current) {
        gamepadIdRef.current = gamepad?.id ?? null;
        gamepadButtonsRef.current = { a: false, b: false };
        gamepadRepeatRef.current = {
          lastVerticalAt: 0,
          lastHorizontalAt: 0,
          vertical: 0,
          horizontal: 0,
        };
        gamepadLastMoveRef.current = { dx: 0, dy: 0 };
      }
      if (gamepad) {
        const aPressed = Boolean(gamepad.buttons[0]?.pressed);
        const bPressed = Boolean(gamepad.buttons[1]?.pressed);
        const previous = gamepadButtonsRef.current;

        if (aPressed && !previous.a) {
          setGamepadPanelMode((current) => {
            const next = !current;
            if (next) {
              manualMove(0, 0);
              gamepadLastMoveRef.current = { dx: 0, dy: 0 };
            }
            return next;
          });
        }

        if (bPressed && !previous.b) {
          toggleSimulation();
        }

        gamepadButtonsRef.current = { a: aPressed, b: bPressed };

        const axisX = normalizeAxis(gamepad.axes[0]);
        const axisY = normalizeAxis(gamepad.axes[1]);
        const dpadLeft = Boolean(gamepad.buttons[14]?.pressed);
        const dpadRight = Boolean(gamepad.buttons[15]?.pressed);
        const dpadUp = Boolean(gamepad.buttons[12]?.pressed);
        const dpadDown = Boolean(gamepad.buttons[13]?.pressed);

        if (gamepadPanelModeRef.current) {
          const now = performance.now();
          const vertical = axisY < -0.55 || dpadUp ? -1 : axisY > 0.55 || dpadDown ? 1 : 0;
          const horizontal = axisX < -0.55 || dpadLeft ? -1 : axisX > 0.55 || dpadRight ? 1 : 0;
          const repeat = gamepadRepeatRef.current;

          if (
            vertical !== 0 &&
            (vertical !== repeat.vertical || now - repeat.lastVerticalAt > GAMEPAD_DIRECTION_REPEAT_MS)
          ) {
            setGamepadSelectedIndex((current) =>
              (current + vertical + GAMEPAD_CONTROL_COUNT) % GAMEPAD_CONTROL_COUNT,
            );
            repeat.vertical = vertical;
            repeat.lastVerticalAt = now;
          } else if (vertical === 0) {
            repeat.vertical = 0;
          }

          if (
            horizontal !== 0 &&
            (horizontal !== repeat.horizontal || now - repeat.lastHorizontalAt > GAMEPAD_DIRECTION_REPEAT_MS)
          ) {
            setGamepadAdjustment((prev) => ({
              nonce: (prev?.nonce ?? 0) + 1,
              direction: horizontal as -1 | 1,
            }));
            repeat.horizontal = horizontal;
            repeat.lastHorizontalAt = now;
          } else if (horizontal === 0) {
            repeat.horizontal = 0;
          }
        } else if (connectedRef.current && configRef.current.enable_manual_robot !== false) {
          emitRobotMove(axisX, axisY);
        }
      }

      frameId = window.requestAnimationFrame(pollGamepad);
    };

    frameId = window.requestAnimationFrame(pollGamepad);

    return () => {
      window.cancelAnimationFrame(frameId);
      manualMove(0, 0);
    };
  }, [connect, disconnect, handleReset, manualMove]);

  const totalSteps = config.steps;
  const cappedTick = Math.min(tick, totalSteps);

  return (
    <div
      className="min-h-screen p-4 text-[#1a3744]"
      style={{
        background:
          "linear-gradient(180deg, #f4fafc 0%, #e9f4f7 100%)",
      }}
    >
      <div className="max-w-[1540px] mx-auto">
        {/* Header — Reef Patrol (Variation A) */}
        <header className="mb-5 flex items-end justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <svg width="34" height="34" viewBox="0 0 36 36" aria-hidden>
              <circle cx="18" cy="18" r="17" fill="white" stroke="#0e6a7b" strokeWidth="1.5" />
              <path d="M 6 22 Q 12 16 18 22 T 30 22" stroke="#0e6a7b" strokeWidth="2" fill="none" />
              <path
                d="M 6 27 Q 12 21 18 27 T 30 27"
                stroke="#0e6a7b"
                strokeWidth="2"
                fill="none"
                opacity="0.5"
              />
            </svg>
            <div>
              <div className="text-[20px] font-bold tracking-[-0.02em] text-[#0e6a7b] leading-tight">
                ロボットシミュレーションゲーム
              </div>
              <p className="text-[11px] text-[#5d7a85] leading-[1.55] mt-1 max-w-[640px]">
                スカウト機が海に漂うごみを見つけ、コレクター機がそれを基地まで運びます。
                <br />
                魚たちは群れで泳ぎながらロボットを避け、ときどき近くに流れてきたごみを食べてしまいます。
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2.5">
            <span
              className={`text-[11px] font-semibold px-2.5 py-1 rounded-full inline-flex items-center gap-1.5 ${
                phase === "running"
                  ? "text-[#1a9a7e] bg-[#1a9a7e]/10"
                  : phase === "completed"
                  ? "text-amber-700 bg-amber-100"
                  : phase === "stopped"
                  ? "text-rose-700 bg-rose-100"
                  : "text-slate-600 bg-slate-100"
              }`}
            >
              <span
                className="w-[7px] h-[7px] rounded-full"
                style={{
                  background:
                    phase === "running"
                      ? "#1a9a7e"
                      : phase === "completed"
                      ? "#b58a32"
                      : phase === "stopped"
                      ? "#d05a4f"
                      : "#94a3b8",
                  boxShadow:
                    phase === "running"
                      ? "0 0 0 4px rgba(26, 154, 126, 0.18)"
                      : "none",
                }}
              />
              {phase}
            </span>
            <span className="text-[11px] text-[#5d7a85] tabular-nums">
              tick {cappedTick} / {totalSteps}
            </span>
          </div>
        </header>

        {/* 3-column body — center Canvas is unchanged */}
        <div className="flex flex-col lg:flex-row gap-4 items-start">
          <ControlPanel
            connected={connected}
            config={config}
            phase={phase}
            onConnect={connect}
            onDisconnect={disconnect}
            onReset={handleReset}
            onConfigChange={setPanelConfig}
            gamepadFocused={gamepadPanelMode}
            gamepadSelectedIndex={gamepadSelectedIndex}
            gamepadAdjustment={gamepadAdjustment}
          />
          <div className="flex-1 min-w-0 flex flex-col items-center gap-2">
            <div className="flex flex-wrap gap-2 self-end items-center">
              {view === "3d" && (
                <div className="flex gap-1 mr-2">
                  {(
                    [
                      { id: "angle", label: "斜め" },
                      { id: "top", label: "俯瞰" },
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
              <Suspense fallback={<CanvasLoading width={config.width} height={config.height} />}>
                <Canvas3D
                  agents={agents}
                  base={base}
                  discoveredTrashIds={discoveredTrashIds}
                  width={config.width}
                  height={config.height}
                  cameraPreset={cameraPreset}
                />
              </Suspense>
            ) : (
              <Suspense fallback={<CanvasLoading width={config.width} height={config.height} />}>
                <Canvas
                  agents={agents}
                  base={base}
                  width={config.width}
                  height={config.height}
                />
              </Suspense>
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

function CanvasLoading({ width, height }: { width: number; height: number }) {
  return (
    <div
      style={{
        width: "100%",
        maxWidth: width,
        aspectRatio: `${width} / ${height}`,
      }}
      className="border border-cyan-950 rounded-2xl shadow-2xl overflow-hidden bg-[#031624]"
    />
  );
}
