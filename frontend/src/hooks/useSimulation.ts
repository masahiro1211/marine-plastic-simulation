import { useCallback, useEffect, useRef, useState } from "react";
import { DEFAULT_SIMULATION_CONFIG } from "../config/defaultSimulationConfig";
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

const env = import.meta.env as Record<string, string | undefined>;

function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/, "");
}

function websocketUrlFromApiUrl(apiUrl: string): string {
  try {
    const url = new URL(apiUrl);
    url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
    url.pathname = "/ws/simulation";
    url.search = "";
    url.hash = "";
    return url.toString();
  } catch {
    return "ws://localhost:8000/ws/simulation";
  }
}

const API_URL = trimTrailingSlash(
  env.VITE_API_URL ?? env.REACT_APP_API_URL ?? "http://localhost:8000"
);
const WS_URL =
  env.VITE_WS_URL ?? env.REACT_APP_WS_URL ?? websocketUrlFromApiUrl(API_URL);
const LIVE_SNAPSHOT_STATE_INTERVAL_MS = 100;

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

function shallowObjectEqual<T extends Record<string, unknown>>(left: T, right: T): boolean {
  const leftKeys = Object.keys(left);
  const rightKeys = Object.keys(right);
  if (leftKeys.length !== rightKeys.length) return false;
  return leftKeys.every((key) => left[key] === right[key]);
}

function baseStateEqual(left: BaseState, right: BaseState): boolean {
  return left.x === right.x && left.y === right.y && left.radius === right.radius;
}

function stringArrayEqual(left: string[], right: string[]): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

interface SimulationState {
  agents: AgentState[];
  stats: SimulationStats;
  score: ScoreState;
  config: SimulationConfig;
  base: BaseState;
  discoveredTrashIds: string[];
  tick: number;
  phase: SimulationPhase;
  connected: boolean;
  connect: () => void;
  disconnect: () => void;
  reset: (nextConfig: SimulationConfig) => void;
  stop: () => void;
  resetViaApi: (nextConfig: SimulationConfig) => Promise<void>;
  fetchStatsHistory: () => Promise<HistoryEntry[]>;
  manualMove: (dx: number, dy: number) => void;
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
  const [config, setConfig] = useState<SimulationConfig>(DEFAULT_SIMULATION_CONFIG);
  const [base, setBase] = useState<BaseState>(DEFAULT_BASE);
  const [discoveredTrashIds, setDiscoveredTrashIds] = useState<string[]>([]);
  const [tick, setTick] = useState<number>(0);
  const [phase, setPhase] = useState<SimulationPhase>("idle");
  const [connected, setConnected] = useState<boolean>(false);
  const wsRef = useRef<WebSocket | null>(null);
  const latestSnapshotRef = useRef<Partial<SimulationSnapshot> | null>(null);
  const snapshotTimerRef = useRef<ReturnType<typeof window.setTimeout> | null>(null);
  const lastSnapshotAppliedAtRef = useRef<number>(0);

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
      setConfig((current) =>
        shallowObjectEqual(
          current as unknown as Record<string, unknown>,
          data.config as unknown as Record<string, unknown>,
        )
          ? current
          : data.config as SimulationConfig
      );
    }
    if (data.base) {
      setBase((current) => (baseStateEqual(current, data.base as BaseState) ? current : data.base as BaseState));
    }
    const nextDiscoveredTrashIds = data.discovered_trash_ids ?? [];
    setDiscoveredTrashIds((current) =>
      stringArrayEqual(current, nextDiscoveredTrashIds) ? current : nextDiscoveredTrashIds
    );
  }, []);

  const clearSnapshotTimer = useCallback(() => {
    if (snapshotTimerRef.current) {
      window.clearTimeout(snapshotTimerRef.current);
      snapshotTimerRef.current = null;
    }
  }, []);

  const flushLatestSnapshot = useCallback(() => {
    const snapshot = latestSnapshotRef.current;
    if (!snapshot) return;
    latestSnapshotRef.current = null;
    clearSnapshotTimer();
    lastSnapshotAppliedAtRef.current = performance.now();
    applySnapshot(snapshot);
  }, [applySnapshot, clearSnapshotTimer]);

  const scheduleSnapshot = useCallback(
    (data: Partial<SimulationSnapshot>, immediate = false) => {
      if (immediate || data.phase !== "running") {
        latestSnapshotRef.current = null;
        clearSnapshotTimer();
        lastSnapshotAppliedAtRef.current = performance.now();
        applySnapshot(data);
        return;
      }

      latestSnapshotRef.current = data;
      const now = performance.now();
      const elapsed = now - lastSnapshotAppliedAtRef.current;

      if (elapsed >= LIVE_SNAPSHOT_STATE_INTERVAL_MS) {
        flushLatestSnapshot();
        return;
      }

      if (!snapshotTimerRef.current) {
        snapshotTimerRef.current = window.setTimeout(
          flushLatestSnapshot,
          LIVE_SNAPSHOT_STATE_INTERVAL_MS - elapsed,
        );
      }
    },
    [applySnapshot, clearSnapshotTimer, flushLatestSnapshot],
  );

  /**
   * Open the simulation WebSocket and start receiving tick snapshots.
   */
  const connect = useCallback(() => {
    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;

    ws.onopen = () => {
      setConnected(true);
      ws.send(JSON.stringify({ action: "start" }));
    };
    ws.onclose = () => setConnected(false);
    ws.onmessage = (event: MessageEvent<string>) => {
      const data: SimulationSnapshot = JSON.parse(event.data);
      scheduleSnapshot(data);
    };
  }, [scheduleSnapshot]);

  /**
   * Close the active simulation WebSocket connection if one exists.
   */
  const disconnect = useCallback(() => {
    if (wsRef.current) {
      if (wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ action: "stop" }));
      }
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

  const manualMove = useCallback(
    (dx: number, dy: number) => sendAction("manual_move", { dx, dy }),
    [sendAction]
  );

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
      setConfig(result.config ?? DEFAULT_SIMULATION_CONFIG);

      const snapshotResponse = await fetch(`${API_URL}/api/simulation/snapshot`);
      scheduleSnapshot((await snapshotResponse.json()) as SimulationSnapshot, true);
    },
    [scheduleSnapshot]
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
          scheduleSnapshot(data, true);
        }
      })
      .catch(() => {});

    return () => {
      mounted = false;
      clearSnapshotTimer();
      disconnect();
    };
  }, [clearSnapshotTimer, disconnect, scheduleSnapshot]);

  return {
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
    stop,
    resetViaApi,
    fetchStatsHistory,
    manualMove,
  };
}
