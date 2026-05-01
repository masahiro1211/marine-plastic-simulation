import { useCallback, useEffect, useRef, useState } from "react";
import type {
  AgentState,
  BaseState,
  HistoryEntry,
  ScoreState,
  SimulationConfig,
  SimulationPhase,
  SimulationSnapshot,
  SimulationStats,
} from "../types";

const WS_URL =
  process.env.REACT_APP_WS_URL ?? "ws://localhost:8000/ws/simulation";
const API_URL = process.env.REACT_APP_API_URL ?? "http://localhost:8000";

const DEFAULT_CONFIG: SimulationConfig = {
  width: 960,
  height: 640,
  steps: 600,
  tick_interval_ms: 50,
  scout_count: 2,
  collector_count: 3,
  marine_life_count: 10,
  initial_trash_count: 18,
  scout_speed: 2.2,
  collector_speed: 1.8,
  marine_life_speed: 1.6,
  trash_drift_speed: 0.35,
  trash_weight: 1.0,
  avoid_marine_life_weight: 1.15,
  avoid_robot_weight: 0.85,
  random_weight: 0.3,
  scout_sensor_radius: 110,
  collector_sensor_radius: 42,
  collector_pickup_radius: 16,
  marine_life_avoid_radius: 90,
  collision_radius: 18,
  base_radius: 48,
  max_energy: 100,
  energy_drain_per_tick: 0.55,
  energy_charge_per_tick: 3.0,
  return_speed_factor: 0.45,
  low_energy_threshold: 18,
  trash_spawn_interval: 24,
  max_trash: 30,
  sharing_mode: "global",
};

const DEFAULT_STATS: SimulationStats = {
  scouts: 0,
  collectors: 0,
  marine_life: 0,
  trash_remaining: 0,
  active_robots: 0,
  delivered_trash: 0,
  robot_fish_contacts: 0,
  fish_ate_trash: 0,
};

const DEFAULT_SCORE: ScoreState = {
  total: 0,
  trash_delivered: 0,
  collisions: 0,
  energy_remaining: 0,
};

const DEFAULT_BASE: BaseState = { x: 480, y: 604, radius: 48 };

interface SimulationState {
  agents: AgentState[];
  stats: SimulationStats;
  score: ScoreState;
  config: SimulationConfig;
  base: BaseState;
  tick: number;
  phase: SimulationPhase;
  connected: boolean;
  connect: () => void;
  disconnect: () => void;
  reset: (nextConfig: SimulationConfig) => void;
  stop: () => void;
  resetViaApi: (nextConfig: SimulationConfig) => Promise<void>;
  fetchStatsHistory: () => Promise<HistoryEntry[]>;
}

/**
 * Manage simulation transport state across REST bootstrap and WebSocket streaming.
 *
 * @returns Aggregated simulation state and transport actions for the UI.
 */
export default function useSimulation(): SimulationState {
  const [agents, setAgents] = useState<AgentState[]>([]);
  const [stats, setStats] = useState<SimulationStats>(DEFAULT_STATS);
  const [score, setScore] = useState<ScoreState>(DEFAULT_SCORE);
  const [config, setConfig] = useState<SimulationConfig>(DEFAULT_CONFIG);
  const [base, setBase] = useState<BaseState>(DEFAULT_BASE);
  const [tick, setTick] = useState<number>(0);
  const [phase, setPhase] = useState<SimulationPhase>("idle");
  const [connected, setConnected] = useState<boolean>(false);
  const wsRef = useRef<WebSocket | null>(null);

  /**
   * Apply a partial snapshot payload to local React state.
   *
   * @param data Snapshot payload received from REST or WebSocket.
   */
  const applySnapshot = useCallback((data: Partial<SimulationSnapshot>) => {
    setAgents(data.agents ?? []);
    setStats(data.stats ?? DEFAULT_STATS);
    setScore(data.score ?? DEFAULT_SCORE);
    setTick(data.tick ?? 0);
    setPhase(data.phase ?? "idle");
    if (data.config) {
      setConfig(data.config);
    }
    if (data.base) {
      setBase(data.base);
    }
  }, []);

  /**
   * Open the simulation WebSocket and start receiving tick snapshots.
   */
  const connect = useCallback(() => {
    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;

    ws.onopen = () => setConnected(true);
    ws.onclose = () => setConnected(false);
    ws.onmessage = (event: MessageEvent<string>) => {
      const data: SimulationSnapshot = JSON.parse(event.data);
      applySnapshot(data);
    };
  }, [applySnapshot]);

  /**
   * Close the active simulation WebSocket connection if one exists.
   */
  const disconnect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
  }, []);

  /**
   * Send a control message to the simulation server over WebSocket.
   *
   * @param action Action name understood by the backend.
   * @param payload Optional payload merged into the outbound message.
   */
  const sendAction = useCallback(
    (action: string, payload?: Record<string, unknown>) => {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ action, ...payload }));
      }
    },
    []
  );

  /**
   * Reset the running simulation over WebSocket using the provided configuration.
   *
   * @param nextConfig Configuration to apply after reset.
   */
  const reset = useCallback(
    (nextConfig: SimulationConfig) => sendAction("reset", { config: nextConfig }),
    [sendAction]
  );

  /**
   * Request the backend to stop the running simulation.
   */
  const stop = useCallback(() => sendAction("stop"), [sendAction]);

  /**
   * Reset the simulation through REST when no WebSocket session is active.
   *
   * @param nextConfig Configuration to persist before fetching a fresh snapshot.
   * @returns Promise that resolves when local state has been refreshed.
   */
  const resetViaApi = useCallback(
    async (nextConfig: SimulationConfig) => {
      const response = await fetch(`${API_URL}/api/config`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(nextConfig),
      });
      const result = (await response.json()) as { config?: SimulationConfig };
      setConfig(result.config ?? DEFAULT_CONFIG);

      const snapshotResponse = await fetch(`${API_URL}/api/simulation/snapshot`);
      applySnapshot((await snapshotResponse.json()) as SimulationSnapshot);
    },
    [applySnapshot]
  );

  /**
   * Fetch the per-tick score history used by secondary analytics views.
   *
   * @returns Historical entries from the backend.
   */
  const fetchStatsHistory = useCallback(async (): Promise<HistoryEntry[]> => {
    const response = await fetch(`${API_URL}/api/stats/history`);
    return (await response.json()) as HistoryEntry[];
  }, []);

  useEffect(() => {
    let mounted = true;

    void fetch(`${API_URL}/api/simulation/snapshot`)
      .then((response) => response.json() as Promise<SimulationSnapshot>)
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
