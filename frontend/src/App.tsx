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
  } = useSimulation();

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
            base, while marine life keeps schooling, dodges passing robots, and
            occasionally ingests trash that drifts within reach.
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
