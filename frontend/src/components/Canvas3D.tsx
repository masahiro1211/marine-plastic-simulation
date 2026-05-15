import {
  Component,
  Suspense,
  createContext,
  memo,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Canvas as ThreeCanvas, useFrame, useThree } from "@react-three/fiber";
import { useGLTF, useTexture } from "@react-three/drei";
import * as THREE from "three";
import * as SkeletonUtils from "three/examples/jsm/utils/SkeletonUtils.js";
import type { AgentState, BaseState } from "../types";

export type CameraPreset = "angle" | "top";

const COLLECTOR_MODEL_PATHS = [
  "/models/collector.glb",
  "/models/collector_with_can.glb",
  "/models/collector_with_bottle.glb",
  "/models/collector_with_2cans.glb",
  "/models/collector_with_2bottles.glb",
  "/models/collector_with_both.glb",
  "/models/collector_manual.glb",
  "/models/collector_manual_with_can.glb",
  "/models/collector_manual_with_bottle.glb",
  "/models/collector_manual_with_2cans.glb",
  "/models/collector_manual_with_2bottles.glb",
  "/models/collector_manual_with_both.glb",
] as const;

const FISH_MODEL_BY_SPECIES: Record<number, string> = {
  0: "/models/fish.glb",
  1: "/models/fish_2.glb",
  2: "/models/fish_3.glb",
};

function queryFlagAtModuleLoad(key: string): boolean {
  if (typeof window === "undefined") return false;
  const params = new URLSearchParams(window.location.search);
  const value = params.get(key);
  return value === "" || value === "1" || value === "true";
}

useGLTF.setDecoderPath("/draco/");

const ESSENTIAL_MODELS = [
  "/models/orca.glb",
  "/models/scout.glb",
  "/models/fish.glb",
  "/models/can.glb",
  "/models/plastic_bottle.glb",
  "/models/collector.glb",
] as const;

const DEFERRED_MODELS = [
  ...COLLECTOR_MODEL_PATHS.filter((path) => path !== "/models/collector.glb"),
  "/models/fish_2.glb",
  "/models/fish_3.glb",
] as const;
const SKIP_MODEL_PRELOADS = queryFlagAtModuleLoad("perfNoPreload");
if (!SKIP_MODEL_PRELOADS) {
  for (const modelPath of ESSENTIAL_MODELS) {
    useGLTF.preload(modelPath);
  }
}
if (!SKIP_MODEL_PRELOADS && typeof window !== "undefined") {
  const idle =
    (window as unknown as { requestIdleCallback?: (callback: () => void) => void })
      .requestIdleCallback ?? ((callback: () => void) => window.setTimeout(callback, 1500));
  idle(() => {
    for (const modelPath of DEFERRED_MODELS) useGLTF.preload(modelPath);
  });
}

// Trash GLBs are already authored close to scene scale; keep these small so
// the full models stay visually comparable to the other agents.
const CAN_SCALE = 120;
const BOTTLE_SCALE = 90;
const CARRIED_CAN_SCALE = 70;
const CARRIED_BOTTLE_SCALE = 50;

// モデルの forward 方向に応じてヨーを補正する。
// Blender の +Y forward でエクスポートしている場合は 0 のまま。
// 横向き／逆向きで出ている場合は Math.PI / 2 や Math.PI を試す。
const ORCA_YAW_OFFSET = Math.PI;

const ORCA_BASE_SCALE = 4.5;
const POSITION_SNAP_DISTANCE = 180;
const SNAPSHOT_INTERPOLATION_DELAY_MS = 120;
const SNAPSHOT_SAMPLE_MAX_AGE_MS = 1000;
const FISH_ANIMATION_UPDATE_INTERVAL = 1 / 20;
const FULL_RATE_ANIMATION_UPDATE_INTERVAL = 0;

interface AgentSnapshotSample {
  time: number;
  agentsById: Map<string, AgentState>;
}

interface InterpolatedMotion {
  x: number;
  y: number;
  vx: number;
  vy: number;
}

interface CanvasPerfOptions {
  enabled: boolean;
  primitiveAgents: boolean;
  disableAgentAnimations: boolean;
  simpleLights: boolean;
  hideBackground: boolean;
  hideFloor: boolean;
  hideGrid: boolean;
  skipModelPreloads: boolean;
  disableInterpolation: boolean;
  agentLimit: number | null;
  dpr: number | null;
}

interface CanvasPerfStats {
  fps: number;
  frameMs: number;
  renderedAgents: number;
  totalAgents: number;
}

function readCanvasPerfOptions(): CanvasPerfOptions {
  const params = new URLSearchParams(
    typeof window === "undefined" ? "" : window.location.search,
  );
  const has = (key: string) => params.has(key);
  const flag = (key: string) => {
    const value = params.get(key);
    return value === "" || value === "1" || value === "true";
  };
  const positiveNumber = (key: string) => {
    const value = Number(params.get(key));
    return Number.isFinite(value) && value > 0 ? value : null;
  };
  const agentLimit = positiveNumber("perfLimit") ?? positiveNumber("agentLimit");
  const dpr = positiveNumber("perfDpr");
  const enabled =
    flag("perf") ||
    has("perfPrimitive") ||
    has("perfNoAnim") ||
    has("perfSimpleLights") ||
    has("perfNoBg") ||
    has("perfNoFloor") ||
    has("perfNoGrid") ||
    has("perfNoPreload") ||
    has("perfNoInterp") ||
    agentLimit !== null ||
    dpr !== null;

  return {
    enabled,
    primitiveAgents: flag("perfPrimitive"),
    disableAgentAnimations: flag("perfNoAnim"),
    simpleLights: flag("perfSimpleLights"),
    hideBackground: flag("perfNoBg"),
    hideFloor: flag("perfNoFloor"),
    hideGrid: flag("perfNoGrid"),
    skipModelPreloads: flag("perfNoPreload"),
    disableInterpolation: flag("perfNoInterp"),
    agentLimit,
    dpr,
  };
}

interface AnimationRegistry {
  register: (mixer: THREE.AnimationMixer, updateInterval: number) => () => void;
}

const AnimationRegistryContext = createContext<AnimationRegistry | null>(null);

function AnimationMixerRegistry({ children }: { children: ReactNode }) {
  const registrationsRef = useRef(
    new Map<THREE.AnimationMixer, { elapsed: number; updateInterval: number }>(),
  );

  const register = useCallback((mixer: THREE.AnimationMixer, updateInterval: number) => {
    registrationsRef.current.set(mixer, { elapsed: 0, updateInterval });
    return () => {
      registrationsRef.current.delete(mixer);
    };
  }, []);

  useFrame((_, delta) => {
    registrationsRef.current.forEach((registration, mixer) => {
      if (registration.updateInterval <= 0) {
        mixer.update(delta);
        return;
      }
      registration.elapsed += delta;
      if (registration.elapsed >= registration.updateInterval) {
        mixer.update(registration.elapsed);
        registration.elapsed = 0;
      }
    });
  });

  const value = useMemo(() => ({ register }), [register]);

  return (
    <AnimationRegistryContext.Provider value={value}>
      {children}
    </AnimationRegistryContext.Provider>
  );
}

function useManagedAnimations(
  animations: THREE.AnimationClip[],
  root: THREE.Object3D,
  updateInterval = FULL_RATE_ANIMATION_UPDATE_INTERVAL,
  disabled = false,
) {
  const registry = useContext(AnimationRegistryContext);
  // useGLTF が返す animations は同じ glb 上で共有されるので、別 mixer から
  // 同じ clip を clipAction() すると内部キャッシュが汚染され、片方が
  // uncacheRoot した瞬間にもう片方の clipAction が _cacheIndex undefined
  // で例外を投げる（StrictMode の二重 effect でレースが顕在化する）。
  // clip 自体をインスタンスごとに clone して隔離する。
  const localClips = useMemo(
    () => animations.map((clip) => clip.clone()),
    [animations],
  );
  const mixer = useMemo(() => new THREE.AnimationMixer(root), [root]);
  const names = useMemo(() => localClips.map((clip) => clip.name), [localClips]);
  const actions = useMemo(() => {
    return Object.fromEntries(
      localClips.map((clip) => [clip.name, mixer.clipAction(clip, root)]),
    ) as Record<string, THREE.AnimationAction>;
  }, [localClips, mixer, root]);

  useEffect(() => {
    if (disabled || !registry || localClips.length === 0) return;
    return registry.register(mixer, updateInterval);
  }, [disabled, localClips.length, mixer, registry, updateInterval]);

  useEffect(() => {
    return () => {
      // mixer.uncacheRoot(root) は呼ばない。呼ぶと mixer 内部の _actions が
      // 壊れて、StrictMode の二重 effect で同じ memoized action を再利用した
      // ときに _cacheIndex undefined エラーになる。mixer 自体が unmount で GC
      // 対象になるので、cache を強制的に剥がす必要はない。
      mixer.stopAllAction();
    };
  }, [mixer]);

  return { actions, names };
}

class ModelErrorBoundary extends Component<
  { children: ReactNode; resetKey: string },
  { hasError: boolean; retry: number }
> {
  state = { hasError: false, retry: 0 };
  private retryTimer: ReturnType<typeof window.setTimeout> | null = null;

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    const gltfCache = useGLTF as typeof useGLTF & {
      clear?: (input: string | string[]) => void;
    };
    gltfCache.clear?.(this.props.resetKey);
    if (import.meta.env.DEV) {
      console.warn(`[Canvas3D] Recreating ${this.props.resetKey}`, error);
    }
    if (this.retryTimer) {
      window.clearTimeout(this.retryTimer);
    }
    this.retryTimer = window.setTimeout(() => {
      this.retryTimer = null;
      this.setState((state) => ({ hasError: false, retry: state.retry + 1 }));
    }, 750);
  }

  componentDidUpdate(prevProps: Readonly<{ resetKey: string }>) {
    if (this.state.hasError && prevProps.resetKey !== this.props.resetKey) {
      this.setState((state) => ({ hasError: false, retry: state.retry + 1 }));
    }
  }

  componentWillUnmount() {
    if (this.retryTimer) {
      window.clearTimeout(this.retryTimer);
      this.retryTimer = null;
    }
  }

  render() {
    if (this.state.hasError) return null;
    return <group key={`${this.props.resetKey}:${this.state.retry}`}>{this.props.children}</group>;
  }
}

function assertRenderableScene(scene: THREE.Object3D, modelPath: string) {
  let renderableMeshes = 0;
  scene.traverse((object) => {
    const mesh = object as THREE.Mesh;
    if (!mesh.visible || !mesh.geometry) return;
    const position = mesh.geometry.getAttribute("position");
    if (position && position.count > 0) {
      renderableMeshes += 1;
    }
  });
  if (renderableMeshes === 0) {
    throw new Error(`${modelPath} has no renderable mesh geometry`);
  }
}

function TurnTowardVelocity({
  children,
}: {
  children: ReactNode;
}) {
  return <group>{children}</group>;
}

function OrcaPredator({
  agent,
  disableAnimations = false,
}: {
  agent: AgentState;
  disableAnimations?: boolean;
}) {
  const modelPath = "/models/orca.glb";
  const { scene, animations } = useGLTF(modelPath);
  const cloned = useMemo(() => {
    assertRenderableScene(scene, modelPath);
    return SkeletonUtils.clone(scene);
  }, [scene]);
  const { actions, names } = useManagedAnimations(
    animations,
    cloned,
    FULL_RATE_ANIMATION_UPDATE_INTERVAL,
    disableAnimations,
  );

  useEffect(() => {
    if (disableAnimations) return;
    const first = names[0];
    if (!first) return;
    const action = actions[first];
    if (!action) return;
    action.reset().fadeIn(0.2).play();
    return () => {
      action.fadeOut(0.2);
    };
  }, [actions, disableAnimations, names]);

  const chasing = agent.metadata?.mode === "chase";
  const scale = chasing ? ORCA_BASE_SCALE * 1.1 : ORCA_BASE_SCALE;

  return (
    <TurnTowardVelocity>
      <primitive object={cloned} scale={scale} />
    </TurnTowardVelocity>
  );
}

const SCOUT_YAW_OFFSET = Math.PI;
const SCOUT_BASE_SCALE = 4;

function ScoutMesh({
  agent,
  disableAnimations = false,
}: {
  agent: AgentState;
  disableAnimations?: boolean;
}) {
  const modelPath = "/models/scout.glb";
  const { scene, animations } = useGLTF(modelPath);
  const cloned = useMemo(() => {
    assertRenderableScene(scene, modelPath);
    return SkeletonUtils.clone(scene);
  }, [scene]);
  const { actions, names } = useManagedAnimations(
    animations,
    cloned,
    FULL_RATE_ANIMATION_UPDATE_INTERVAL,
    disableAnimations,
  );

  useEffect(() => {
    if (disableAnimations) return;
    const first = names[0];
    if (!first) return;
    const action = actions[first];
    if (!action) return;
    action.reset().fadeIn(0.2).play();
    return () => {
      action.fadeOut(0.2);
    };
  }, [actions, disableAnimations, names]);

  return (
    <TurnTowardVelocity>
      <primitive object={cloned} scale={SCOUT_BASE_SCALE} />
    </TurnTowardVelocity>
  );
}

// モデルの forward 方向に応じてヨーを補正する。Blender の +Y forward なら 0。
const COLLECTOR_YAW_OFFSET = 0;
const COLLECTOR_BASE_SCALE = 9;
const COLLECTOR_Y_OFFSET = 0;

function carriedTrashIds(agent: AgentState): string[] {
  const ids = agent.metadata?.carrying_trash_ids;
  if (Array.isArray(ids)) return (ids as unknown[]).map(String);
  if (agent.metadata?.carrying_trash_id) {
    return [String(agent.metadata.carrying_trash_id)];
  }
  return [];
}

function collectorModelPathForAgent(agent: AgentState): string {
  return collectorModelPath(Boolean(agent.metadata?.is_manual), carriedTrashIds(agent));
}

function collectorModelPath(isManual: boolean, carriedIds: string[]): string {
  const prefix = isManual ? "collector_manual" : "collector";
  if (carriedIds.length === 0) return `/models/${prefix}.glb`;
  const cans = carriedIds.filter(isCanTrash).length;
  const bottles = carriedIds.length - cans;
  if (carriedIds.length === 1) {
    return cans === 1
      ? `/models/${prefix}_with_can.glb`
      : `/models/${prefix}_with_bottle.glb`;
  }
  if (cans >= 2) return `/models/${prefix}_with_2cans.glb`;
  if (bottles >= 2) return `/models/${prefix}_with_2bottles.glb`;
  return `/models/${prefix}_with_both.glb`;
}

function CollectorMesh({
  agent,
  modelPath,
  disableAnimations = false,
}: {
  agent: AgentState;
  modelPath: string;
  disableAnimations?: boolean;
}) {
  const { scene, animations } = useGLTF(modelPath);
  const cloned = useMemo(() => {
    assertRenderableScene(scene, modelPath);
    return SkeletonUtils.clone(scene);
  }, [modelPath, scene]);
  const { actions, names } = useManagedAnimations(
    animations,
    cloned,
    FULL_RATE_ANIMATION_UPDATE_INTERVAL,
    disableAnimations,
  );

  useEffect(() => {
    if (disableAnimations) return;
    const first = names[0];
    if (!first) return;
    const action = actions[first];
    if (!action) return;
    action.reset().fadeIn(0.2).play();
    return () => {
      action.fadeOut(0.2);
    };
  }, [actions, disableAnimations, names]);

  return (
    <TurnTowardVelocity>
      <primitive object={cloned} scale={COLLECTOR_BASE_SCALE} position={[0, COLLECTOR_Y_OFFSET, 0]} />
    </TurnTowardVelocity>
  );
}

// モデルの forward 方向に応じてヨーを補正する。
const FISH_YAW_OFFSET = Math.PI;
const FISH_BASE_SCALE = 7.5;

function FishMesh({
  agent,
  disableAnimations = false,
}: {
  agent: AgentState;
  disableAnimations?: boolean;
}) {
  const speciesId = Number(agent.metadata?.species_id ?? 0);
  const modelPath = FISH_MODEL_BY_SPECIES[speciesId] ?? FISH_MODEL_BY_SPECIES[0];
  const { scene, animations } = useGLTF(modelPath);
  const cloned = useMemo(() => {
    assertRenderableScene(scene, modelPath);
    return SkeletonUtils.clone(scene);
  }, [modelPath, scene]);
  const { actions, names } = useManagedAnimations(
    animations,
    cloned,
    FISH_ANIMATION_UPDATE_INTERVAL,
    disableAnimations,
  );

  useEffect(() => {
    if (disableAnimations) return;
    const first = names[0];
    if (!first) return;
    const action = actions[first];
    if (!action) return;
    action.reset().fadeIn(0.2).play();
    return () => {
      action.fadeOut(0.2);
    };
  }, [actions, disableAnimations, names]);

  const scale = (agent.alive ? 1 : 0.4) * FISH_BASE_SCALE;

  return (
    <TurnTowardVelocity>
      <group scale={scale}>
      <primitive object={cloned} />
      </group>
    </TurnTowardVelocity>
  );
}

function hashAgentId(id: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < id.length; i++) {
    h = Math.imul(h ^ id.charCodeAt(i), 16777619);
  }
  return h >>> 0;
}

function isCanTrash(id: string): boolean {
  return (hashAgentId(id) & 1) === 0;
}

function trashRotationY(id: string): number {
  const h = hashAgentId(id);
  return (((h >>> 1) & 0xffff) / 0xffff) * Math.PI * 2;
}

function TrashMesh({ agent, discovered }: { agent: AgentState; discovered: boolean }) {
  const useCan = isCanTrash(agent.id);
  const modelPath = useCan ? "/models/can.glb" : "/models/plastic_bottle.glb";
  const { scene } = useGLTF(modelPath);
  const cloned = useMemo(() => {
    assertRenderableScene(scene, modelPath);
    return SkeletonUtils.clone(scene);
  }, [modelPath, scene]);
  const scale = useCan ? CAN_SCALE : BOTTLE_SCALE;
  const rotationY = trashRotationY(agent.id);

  return (
    <TurnTowardVelocity>
      <primitive object={cloned} rotation={[0, rotationY, 0]} scale={scale} />
      {discovered && (
        <mesh position={[0, -6, 0]} rotation={[-Math.PI / 2, 0, 0]} renderOrder={1}>
          <ringGeometry args={[28, 36, 48]} />
          <meshBasicMaterial
            color="#ef4444"
            transparent
            opacity={0.9}
            side={THREE.DoubleSide}
            depthTest={false}
          />
        </mesh>
      )}
    </TurnTowardVelocity>
  );
}

function PrimitiveAgentMesh({
  agent,
  discovered,
}: {
  agent: AgentState;
  discovered: boolean;
}) {
  const color =
    agent.agent_type === "predator"
      ? "#111827"
      : agent.agent_type === "scout"
        ? "#38bdf8"
        : agent.agent_type === "collector"
          ? "#facc15"
          : agent.agent_type === "marine_life"
            ? agent.alive ? "#22c55e" : "#64748b"
            : "#f97316";
  const scale =
    agent.agent_type === "predator"
      ? [28, 12, 48]
      : agent.agent_type === "trash"
        ? [18, 8, 18]
        : agent.agent_type === "marine_life"
          ? [20, 10, 34]
          : [24, 12, 24];

  return (
    <TurnTowardVelocity>
      <mesh scale={scale as [number, number, number]}>
        {agent.agent_type === "trash" ? (
          <boxGeometry args={[1, 1, 1]} />
        ) : (
          <sphereGeometry args={[1, 16, 8]} />
        )}
        <meshBasicMaterial color={color} />
      </mesh>
      {discovered && (
        <mesh position={[0, -6, 0]} rotation={[-Math.PI / 2, 0, 0]} renderOrder={1}>
          <ringGeometry args={[28, 36, 48]} />
          <meshBasicMaterial
            color="#ef4444"
            transparent
            opacity={0.9}
            side={THREE.DoubleSide}
            depthTest={false}
          />
        </mesh>
      )}
    </TurnTowardVelocity>
  );
}

function AgentNodeView({
  agent,
  cx,
  cz,
  registerAgentGroup,
  discovered,
  perfOptions,
}: {
  agent: AgentState;
  cx: number;
  cz: number;
  registerAgentGroup: (id: string, group: THREE.Group | null) => void;
  discovered: boolean;
  perfOptions: CanvasPerfOptions;
}) {
  const wx = agent.x - cx;
  const wz = agent.y - cz;
  const y = agent.agent_type === "predator" ? 14 : 8;
  const collectorModelPath =
    agent.agent_type === "collector" ? collectorModelPathForAgent(agent) : null;
  const initialPositionRef = useRef<[number, number, number]>([wx, y, wz]);
  const setGroupRef = useCallback(
    (group: THREE.Group | null) => {
      if (group) {
        group.position.set(...initialPositionRef.current);
      }
      registerAgentGroup(agent.id, group);
    },
    [agent.id, registerAgentGroup],
  );

  return (
    <group ref={setGroupRef} position={initialPositionRef.current}>
      {perfOptions.primitiveAgents && (
        <PrimitiveAgentMesh agent={agent} discovered={discovered} />
      )}
      {!perfOptions.primitiveAgents && (
        <>
          {agent.agent_type === "predator" && (
            <ModelErrorBoundary resetKey="/models/orca.glb">
              <Suspense fallback={null}>
                <OrcaPredator
                  agent={agent}
                  disableAnimations={perfOptions.disableAgentAnimations}
                />
              </Suspense>
            </ModelErrorBoundary>
          )}
          {agent.agent_type === "scout" && (
            <ModelErrorBoundary resetKey="/models/scout.glb">
              <Suspense fallback={null}>
                <ScoutMesh
                  agent={agent}
                  disableAnimations={perfOptions.disableAgentAnimations}
                />
              </Suspense>
            </ModelErrorBoundary>
          )}
          {agent.agent_type === "collector" && (
            <ModelErrorBoundary resetKey={collectorModelPath ?? "/models/collector.glb"}>
              <Suspense fallback={null}>
                <CollectorMesh
                  agent={agent}
                  modelPath={collectorModelPath ?? "/models/collector.glb"}
                  disableAnimations={perfOptions.disableAgentAnimations}
                />
              </Suspense>
            </ModelErrorBoundary>
          )}
          {agent.agent_type === "marine_life" && (
            <ModelErrorBoundary
              resetKey={
                FISH_MODEL_BY_SPECIES[Number(agent.metadata?.species_id ?? 0)] ??
                FISH_MODEL_BY_SPECIES[0]
              }
            >
              <Suspense fallback={null}>
                <FishMesh
                  agent={agent}
                  disableAnimations={perfOptions.disableAgentAnimations}
                />
              </Suspense>
            </ModelErrorBoundary>
          )}
          {agent.agent_type === "trash" && (
            <ModelErrorBoundary
              resetKey={isCanTrash(agent.id) ? "/models/can.glb" : "/models/plastic_bottle.glb"}
            >
              <Suspense fallback={null}>
                <TrashMesh agent={agent} discovered={discovered} />
              </Suspense>
            </ModelErrorBoundary>
          )}
        </>
      )}
    </group>
  );
}

function modelRelevantMetadata(agent: AgentState): string {
  if (agent.agent_type === "collector") {
    return collectorModelPathForAgent(agent);
  }
  if (agent.agent_type === "marine_life") {
    return String(agent.metadata?.species_id ?? 0);
  }
  if (agent.agent_type === "predator") {
    return String(agent.metadata?.mode ?? "");
  }
  return "";
}

const AgentNode = memo(
  AgentNodeView,
  (prev, next) =>
    prev.agent.id === next.agent.id &&
    prev.agent.agent_type === next.agent.agent_type &&
    prev.agent.alive === next.agent.alive &&
    prev.discovered === next.discovered &&
    prev.cx === next.cx &&
    prev.cz === next.cz &&
    prev.perfOptions === next.perfOptions &&
    modelRelevantMetadata(prev.agent) === modelRelevantMetadata(next.agent),
);

function yawOffsetForAgent(agent: AgentState): number {
  if (agent.agent_type === "predator") return ORCA_YAW_OFFSET;
  if (agent.agent_type === "scout") return SCOUT_YAW_OFFSET;
  if (agent.agent_type === "collector") return COLLECTOR_YAW_OFFSET;
  if (agent.agent_type === "marine_life") return FISH_YAW_OFFSET;
  return 0;
}

function lerp(left: number, right: number, alpha: number): number {
  return left + (right - left) * alpha;
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

function resolveInterpolatedMotion(
  agent: AgentState,
  samples: AgentSnapshotSample[],
  renderTime: number,
): InterpolatedMotion {
  if (samples.length < 2) {
    return { x: agent.x, y: agent.y, vx: agent.vx, vy: agent.vy };
  }

  let previous = samples[0];
  let next = samples[samples.length - 1];
  for (let i = 0; i < samples.length - 1; i++) {
    const left = samples[i];
    const right = samples[i + 1];
    if (left.time <= renderTime && renderTime <= right.time) {
      previous = left;
      next = right;
      break;
    }
  }

  const previousAgent = previous.agentsById.get(agent.id);
  const nextAgent = next.agentsById.get(agent.id);
  if (!previousAgent || !nextAgent) {
    return { x: agent.x, y: agent.y, vx: agent.vx, vy: agent.vy };
  }

  const span = Math.max(next.time - previous.time, 1);
  const alpha = clamp01((renderTime - previous.time) / span);
  return {
    x: lerp(previousAgent.x, nextAgent.x, alpha),
    y: lerp(previousAgent.y, nextAgent.y, alpha),
    vx: lerp(previousAgent.vx, nextAgent.vx, alpha),
    vy: lerp(previousAgent.vy, nextAgent.vy, alpha),
  };
}

function shouldResetMotionSamples(
  latestSample: AgentSnapshotSample,
  nextAgents: AgentState[],
): boolean {
  const snapDistanceSq = POSITION_SNAP_DISTANCE * POSITION_SNAP_DISTANCE;
  for (const agent of nextAgents) {
    const previous = latestSample.agentsById.get(agent.id);
    if (!previous) continue;
    const dx = agent.x - previous.x;
    const dy = agent.y - previous.y;
    if (dx * dx + dy * dy > snapDistanceSq) return true;
  }
  return false;
}

function isManualAgent(agent: AgentState): boolean {
  return agent.agent_type === "collector" && agent.metadata?.is_manual === true;
}

function AgentsLayer({
  agents,
  discoveredSet,
  cx,
  cz,
  perfOptions,
}: {
  agents: AgentState[];
  discoveredSet: Set<string>;
  cx: number;
  cz: number;
  perfOptions: CanvasPerfOptions;
}) {
  const agentGroupsRef = useRef(new Map<string, THREE.Group>());
  const snapshotSamplesRef = useRef<AgentSnapshotSample[]>([]);

  const registerAgentGroup = useCallback((id: string, group: THREE.Group | null) => {
    if (group) {
      agentGroupsRef.current.set(id, group);
    } else {
      agentGroupsRef.current.delete(id);
    }
  }, []);

  const visibleAgents = useMemo(
    () =>
      perfOptions.agentLimit === null
        ? agents
        : agents.slice(0, Math.floor(perfOptions.agentLimit)),
    [agents, perfOptions.agentLimit],
  );

  useEffect(() => {
    const now = performance.now();
    const samples = snapshotSamplesRef.current;
    const latestSample = samples[samples.length - 1];
    if (latestSample && shouldResetMotionSamples(latestSample, visibleAgents)) {
      samples.length = 0;
    }
    samples.push({
      time: now,
      agentsById: new Map(visibleAgents.map((agent) => [agent.id, agent])),
    });

    while (
      samples.length > 12 ||
      (samples.length > 2 && now - samples[0].time > SNAPSHOT_SAMPLE_MAX_AGE_MS)
    ) {
      samples.shift();
    }
  }, [visibleAgents]);

  useFrame(() => {
    const snapDistanceSq = POSITION_SNAP_DISTANCE * POSITION_SNAP_DISTANCE;
    const renderTime = performance.now() - SNAPSHOT_INTERPOLATION_DELAY_MS;
    const samples = snapshotSamplesRef.current;

    for (const agent of visibleAgents) {
      const group = agentGroupsRef.current.get(agent.id);
      if (!group) continue;

      const motion = perfOptions.disableInterpolation || isManualAgent(agent)
        ? { x: agent.x, y: agent.y, vx: agent.vx, vy: agent.vy }
        : resolveInterpolatedMotion(agent, samples, renderTime);
      const wx = motion.x - cx;
      const wz = motion.y - cz;
      const y = agent.agent_type === "predator" ? 14 : 8;
      const dx = wx - group.position.x;
      const dy = y - group.position.y;
      const dz = wz - group.position.z;

      if (dx * dx + dy * dy + dz * dz > snapDistanceSq) {
        group.position.set(wx, y, wz);
      } else {
        group.position.set(wx, y, wz);
      }

      const { vx, vy } = motion;
      if (vx * vx + vy * vy > 1e-3) {
        const target = Math.atan2(vx, vy) + yawOffsetForAgent(agent);
        let diff = target - group.rotation.y;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        group.rotation.y += diff * 0.2;
      }
    }
  });

  return (
    <>
      {visibleAgents.map((agent) => (
        <AgentNode
          key={agent.id}
          agent={agent}
          cx={cx}
          cz={cz}
          registerAgentGroup={registerAgentGroup}
          discovered={agent.agent_type === "trash" && discoveredSet.has(agent.id)}
          perfOptions={perfOptions}
        />
      ))}
    </>
  );
}

const PRESET_DIRECTIONS: Record<CameraPreset, [number, number, number]> = {
  angle: [0, 0.85, 0.7],
  top: [0, 1, 0.001],
};

const PRESET_MARGIN: Record<CameraPreset, number> = {
  angle: 1.15,
  top: 1.05,
};

function computeFitDistance(
  width: number,
  height: number,
  fovDeg: number,
  aspect: number,
  margin = 0.9,
): number {
  const fovV = (fovDeg * Math.PI) / 180;
  const fovH = 2 * Math.atan(Math.tan(fovV / 2) * Math.max(aspect, 0.001));
  const distV = height * 0.5 / Math.tan(fovV / 2);
  const distH = width * 0.5 / Math.tan(fovH / 2);
  return Math.max(distV, distH) * margin;
}

function FieldGrid({
  width,
  height,
  divisions = 20,
  color = "#1e3a5f",
}: {
  width: number;
  height: number;
  divisions?: number;
  color?: string;
}) {
  const geometry = useMemo(() => {
    const cellSize = Math.max(width, height) / divisions;
    const w2 = width / 2;
    const h2 = height / 2;
    const verts: number[] = [];
    for (let z = -h2; z <= h2 + 0.001; z += cellSize) {
      verts.push(-w2, 0, z, w2, 0, z);
    }
    for (let x = -w2; x <= w2 + 0.001; x += cellSize) {
      verts.push(x, 0, -h2, x, 0, h2);
    }
    const geom = new THREE.BufferGeometry();
    geom.setAttribute("position", new THREE.Float32BufferAttribute(verts, 3));
    return geom;
  }, [width, height, divisions]);

  useEffect(() => () => geometry.dispose(), [geometry]);

  return (
    <lineSegments geometry={geometry} position={[0, 0.1, 0]}>
      <lineBasicMaterial color={color} />
    </lineSegments>
  );
}

function SceneBackground() {
  const texture = useTexture("/assets/images/underwater-background.webp");
  const { scene } = useThree();
  useMemo(() => {
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.minFilter = THREE.LinearFilter;
    texture.generateMipmaps = false;
    texture.anisotropy = 1;
    texture.needsUpdate = true;
  }, [texture]);
  useEffect(() => {
    const prev = scene.background;
    scene.background = texture;
    return () => {
      scene.background = prev;
    };
  }, [scene, texture]);
  return null;
}

function CameraPresetController({
  preset,
  width,
  height,
  margin,
}: {
  preset: CameraPreset;
  width: number;
  height: number;
  margin: number;
}) {
  const { camera, size } = useThree();
  useEffect(() => {
    const persp = camera as THREE.PerspectiveCamera;
    const aspect = size.width / Math.max(size.height, 1);
    const dist = computeFitDistance(width, height, persp.fov ?? 45, aspect, margin);
    const dir = PRESET_DIRECTIONS[preset];
    const dirLen = Math.hypot(dir[0], dir[1], dir[2]) || 1;
    const nx = dir[0] / dirLen;
    const ny = dir[1] / dirLen;
    const nz = dir[2] / dirLen;
    camera.position.set(nx * dist, ny * dist, nz * dist);
    camera.lookAt(0, 0, 0);
    persp.updateProjectionMatrix();
  }, [preset, camera, width, height, margin, size.width, size.height]);
  return null;
}

function PerfSampler({
  totalAgents,
  renderedAgents,
  onSample,
}: {
  totalAgents: number;
  renderedAgents: number;
  onSample: (stats: CanvasPerfStats) => void;
}) {
  const frameCountRef = useRef(0);
  const elapsedRef = useRef(0);

  useFrame((_, delta) => {
    frameCountRef.current += 1;
    elapsedRef.current += delta;
    if (elapsedRef.current < 0.5) return;

    const fps = frameCountRef.current / elapsedRef.current;
    onSample({
      fps,
      frameMs: 1000 / Math.max(fps, 0.001),
      renderedAgents,
      totalAgents,
    });
    frameCountRef.current = 0;
    elapsedRef.current = 0;
  });

  return null;
}

function PerfOverlay({
  stats,
  options,
}: {
  stats: CanvasPerfStats;
  options: CanvasPerfOptions;
}) {
  const activeFlags = [
    options.primitiveAgents && "primitive",
    options.disableAgentAnimations && "no-anim",
    options.simpleLights && "simple-lights",
    options.hideBackground && "no-bg",
    options.hideFloor && "no-floor",
    options.hideGrid && "no-grid",
    options.skipModelPreloads && "no-preload",
    options.disableInterpolation && "no-interp",
    options.agentLimit !== null && `limit:${Math.floor(options.agentLimit)}`,
    options.dpr !== null && `dpr:${options.dpr}`,
  ].filter(Boolean);

  return (
    <div className="absolute left-2 top-2 z-10 rounded bg-slate-950/85 px-2 py-1 font-mono text-[11px] leading-5 text-cyan-100 shadow-lg">
      <div>fps {stats.fps.toFixed(1)}</div>
      <div>ms {stats.frameMs.toFixed(1)}</div>
      <div>
        agents {stats.renderedAgents}/{stats.totalAgents}
      </div>
      {activeFlags.length > 0 && (
        <div className="max-w-[220px] text-cyan-300">{activeFlags.join(" ")}</div>
      )}
    </div>
  );
}

interface Canvas3DProps {
  agents: AgentState[];
  base: BaseState;
  discoveredTrashIds?: string[];
  width?: number;
  height?: number;
  cameraPreset?: CameraPreset;
}

export default function Canvas3D({
  agents,
  base,
  discoveredTrashIds,
  width = 960,
  height = 640,
  cameraPreset = "angle",
}: Canvas3DProps) {
  const perfOptions = useMemo(readCanvasPerfOptions, []);
  const renderedAgentCount =
    perfOptions.agentLimit === null
      ? agents.length
      : Math.min(agents.length, Math.floor(perfOptions.agentLimit));
  const [perfStats, setPerfStats] = useState<CanvasPerfStats>({
    fps: 0,
    frameMs: 0,
    renderedAgents: renderedAgentCount,
    totalAgents: agents.length,
  });
  const discoveredSet = useMemo(
    () => new Set(discoveredTrashIds ?? []),
    [discoveredTrashIds]
  );
  const cx = width / 2;
  const cz = height / 2;
  const sceneSize = Math.max(width, height);
  const margin = PRESET_MARGIN[cameraPreset];
  const aspect = width / height;
  const defaultDist = useMemo(
    () => computeFitDistance(width, height, 45, aspect, margin),
    [width, height, aspect, margin]
  );

  return (
    <div
      style={{
        width: "100%",
        maxWidth: width,
        aspectRatio: `${width} / ${height}`,
      }}
      className="border border-cyan-950 rounded-2xl shadow-2xl overflow-hidden bg-[#0c4a72] relative"
    >
      <ThreeCanvas
        camera={{ position: [0, defaultDist * 0.85, defaultDist * 0.7], fov: 45, near: 1, far: sceneSize * 20 }}
        dpr={perfOptions.dpr ?? [1, 1.25]}
        shadows={false}
        gl={{ antialias: false, powerPreference: "high-performance", alpha: false, stencil: false, depth: true }}
        onCreated={({ gl }) => {
          gl.toneMapping = THREE.NoToneMapping;
        }}
      >
        <AnimationMixerRegistry>
          <CameraPresetController
            preset={cameraPreset}
            width={width}
            height={height}
            margin={margin}
          />
          {perfOptions.hideBackground ? (
            <color attach="background" args={["#0c4a72"]} />
          ) : (
            <Suspense fallback={<color attach="background" args={["#0c4a72"]} />}>
              <SceneBackground />
            </Suspense>
          )}
          {perfOptions.simpleLights ? (
            <>
              <ambientLight intensity={1.8} />
              <hemisphereLight args={["#bae6fd", "#0c2740", 1.0]} />
            </>
          ) : (
            <>
              <ambientLight intensity={1.1} />
              <hemisphereLight args={["#bae6fd", "#0c2740", 0.8]} />
              <directionalLight position={[200, 400, 200]} intensity={1.6} color="#ffffff" />
              <directionalLight position={[-200, 200, -100]} intensity={0.7} color="#5eead4" />
            </>
          )}

          {!perfOptions.hideFloor && (
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
              <planeGeometry args={[width, height]} />
              <meshStandardMaterial
                color="#1a5e8a"
                metalness={0.15}
                roughness={0.7}
                transparent
                opacity={0.35}
              />
            </mesh>
          )}

          {!perfOptions.hideGrid && <FieldGrid width={width} height={height} divisions={20} />}

          {base && (
            <group position={[base.x - cx, 0, base.y - cz]}>
              <mesh position={[0, 8, 0]}>
                <boxGeometry args={[140, 16, 30]} />
                <meshStandardMaterial color="#d4a373" />
              </mesh>
              <mesh position={[0, 28, 0]}>
                <boxGeometry args={[56, 24, 24]} />
                <meshStandardMaterial color="#f1f5f9" />
              </mesh>
              <mesh position={[0, 0.6, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                <ringGeometry args={[base.radius - 2, base.radius, 64]} />
                <meshBasicMaterial color="#5eead4" transparent opacity={0.55} />
              </mesh>
            </group>
          )}

          <AgentsLayer
            agents={agents}
            discoveredSet={discoveredSet}
            cx={cx}
            cz={cz}
            perfOptions={perfOptions}
          />
          {perfOptions.enabled && (
            <PerfSampler
              totalAgents={agents.length}
              renderedAgents={renderedAgentCount}
              onSample={setPerfStats}
            />
          )}
        </AnimationMixerRegistry>

      </ThreeCanvas>
      {perfOptions.enabled && <PerfOverlay stats={perfStats} options={perfOptions} />}
    </div>
  );
}
