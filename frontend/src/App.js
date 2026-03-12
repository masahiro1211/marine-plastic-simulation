import React from "react";
import Canvas from "./components/Canvas";
import ControlPanel from "./components/ControlPanel";
import StatsPanel from "./components/StatsPanel";
import useSimulation from "./hooks/useSimulation";

export default function App() {
  const {
    agents,
    stats,
    tick,
    connected,
    connect,
    disconnect,
    reset,
    resetViaApi,
  } = useSimulation();

  const handleReset = (config) => {
    if (connected) {
      reset(config);
    } else {
      resetViaApi(config);
    }
  };

  return (
    <div className="min-h-screen bg-ocean-bg p-6 font-sans">
      <h1 className="text-fish text-center text-2xl font-bold mb-4">
        Marine Plastic Simulation
      </h1>
      <div className="flex gap-4 justify-center items-start">
        <ControlPanel
          connected={connected}
          onConnect={connect}
          onDisconnect={disconnect}
          onReset={handleReset}
        />
        <Canvas agents={agents} />
        <StatsPanel stats={stats} tick={tick} />
      </div>
    </div>
  );
}
