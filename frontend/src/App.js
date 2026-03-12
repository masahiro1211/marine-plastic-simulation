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
    <div style={styles.root}>
      <h1 style={styles.heading}>Marine Plastic Simulation</h1>
      <div style={styles.main}>
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

const styles = {
  root: {
    minHeight: "100vh",
    background: "#0a1929",
    padding: 24,
    fontFamily: "sans-serif",
  },
  heading: {
    color: "#4fc3f7",
    textAlign: "center",
    marginBottom: 16,
  },
  main: {
    display: "flex",
    gap: 16,
    justifyContent: "center",
    alignItems: "flex-start",
  },
};
