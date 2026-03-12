import { useCallback, useEffect, useRef, useState } from "react";

const WS_URL =
  process.env.REACT_APP_WS_URL || "ws://localhost:8000/ws/simulation";
const API_URL =
  process.env.REACT_APP_API_URL || "http://localhost:8000";

export default function useSimulation() {
  const [agents, setAgents] = useState([]);
  const [stats, setStats] = useState({ fish: 0, predators: 0, plastics: 0 });
  const [tick, setTick] = useState(0);
  const [connected, setConnected] = useState(false);
  const wsRef = useRef(null);

  const connect = useCallback(() => {
    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;

    ws.onopen = () => setConnected(true);
    ws.onclose = () => setConnected(false);
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      setAgents(data.agents);
      setStats(data.stats);
      setTick(data.tick);
    };
  }, []);

  const disconnect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
  }, []);

  const sendAction = useCallback((action, config) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ action, config }));
    }
  }, []);

  const reset = useCallback(
    (config) => sendAction("reset", config),
    [sendAction]
  );

  const stop = useCallback(() => sendAction("stop"), [sendAction]);

  const resetViaApi = useCallback(async (config) => {
    if (config) {
      await fetch(`${API_URL}/api/config`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });
    } else {
      await fetch(`${API_URL}/api/reset`, { method: "POST" });
    }
  }, []);

  useEffect(() => {
    return () => disconnect();
  }, [disconnect]);

  return {
    agents,
    stats,
    tick,
    connected,
    connect,
    disconnect,
    reset,
    stop,
    resetViaApi,
  };
}
