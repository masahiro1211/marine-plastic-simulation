import { useCallback, useEffect, useRef, useState } from "react";

const WS_URL =
  process.env.REACT_APP_WS_URL || "ws://localhost:8000/ws/simulation";
const API_URL =
  process.env.REACT_APP_API_URL || "http://localhost:8000";

const DEFAULT_CONFIG = {
  width: 960,
  height: 640,
  steps: 600,
  tick_interval_ms: 50,
  scout_count: 2,
  collector_count: 3,
  marine_life_count: 10,
  initial_trash_count: 18,
};

const DEFAULT_STATS = {
  scouts: 0,
  collectors: 0,
  marine_life: 0,
  trash_remaining: 0,
  active_robots: 0,
  delivered_trash: 0,
};

const DEFAULT_SCORE = {
  total: 0,
  trash_delivered: 0,
  collisions: 0,
  marine_life_stress: 0,
  energy_remaining: 0,
};

export default function useSimulation() {
  const [agents, setAgents] = useState([]);
  const [stats, setStats] = useState(DEFAULT_STATS);
  const [score, setScore] = useState(DEFAULT_SCORE);
  const [config, setConfig] = useState(DEFAULT_CONFIG);
  const [base, setBase] = useState({ x: 480, y: 604, radius: 48 });
  const [tick, setTick] = useState(0);
  const [phase, setPhase] = useState("idle");
  const [connected, setConnected] = useState(false);
  const wsRef = useRef(null);

  const applySnapshot = useCallback((data) => {
    setAgents(data.agents || []);
    setStats(data.stats || DEFAULT_STATS);
    setScore(data.score || DEFAULT_SCORE);
    setTick(data.tick || 0);
    setPhase(data.phase || "idle");
    if (data.config) {
      setConfig(data.config);
    }
    if (data.base) {
      setBase(data.base);
    }
  }, []);

  const connect = useCallback(() => {
    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;

    ws.onopen = () => setConnected(true);
    ws.onclose = () => setConnected(false);
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      applySnapshot(data);
    };
  }, [applySnapshot]);

  const disconnect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
  }, []);

  const sendAction = useCallback((action, payload) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ action, ...payload }));
    }
  }, []);

  const reset = useCallback(
    (nextConfig) => sendAction("reset", { config: nextConfig }),
    [sendAction]
  );

  const stop = useCallback(() => sendAction("stop"), [sendAction]);

  const resetViaApi = useCallback(async (nextConfig) => {
    const response = await fetch(`${API_URL}/api/config`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(nextConfig),
    });
    const result = await response.json();
    setConfig(result.config || DEFAULT_CONFIG);

    const snapshotResponse = await fetch(`${API_URL}/api/simulation/snapshot`);
    applySnapshot(await snapshotResponse.json());
  }, [applySnapshot]);

  const fetchStatsHistory = useCallback(async () => {
    const response = await fetch(`${API_URL}/api/stats/history`);
    return response.json();
  }, []);

  useEffect(() => {
    let mounted = true;
    fetch(`${API_URL}/api/simulation/snapshot`)
      .then((response) => response.json())
      .then((data) => {
        if (mounted) {
          applySnapshot(data);
        }
      })
      .catch(() => {});

    return () => {
      mounted = false;
      disconnect();
    };
  }, [applySnapshot, disconnect]);

  return {
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
    stop,
    resetViaApi,
    fetchStatsHistory,
  };
}
