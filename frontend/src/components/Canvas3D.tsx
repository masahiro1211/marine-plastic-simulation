import {
  Component,
  Suspense,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
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

useGLTF.setDecoderPath("/draco/");
useGLTF.preload("/models/orca.glb");
for (const modelPath of COLLECTOR_MODEL_PATHS) {
  useGLTF.preload(modelPath);
}
for (const modelPath of Object.values(FISH_MODEL_BY_SPECIES)) {
  useGLTF.preload(modelPath);
}
useGLTF.preload("/models/scout.glb");
useGLTF.preload("/models/can.glb");
useGLTF.preload("/models/plastic_bottle.glb");

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
const POSITION_FOLLOW_RATE = 18;
const POSITION_SNAP_DISTANCE = 180;
const FISH_ANIMATION_UPDATE_INTERVAL = 1 / 20;
const FULL_RATE_ANIMATION_UPDATE_INTERVAL = 0;

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
    if (!registry || localClips.length === 0) return;
    return registry.register(mixer, updateInterval);
  }, [localClips.length, mixer, registry, updateInterval]);

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

function OrcaPredator({ agent }: { agent: AgentState }) {
  const modelPath = "/models/orca.glb";
  const { scene, animations } = useGLTF(modelPath);
  const cloned = useMemo(() => {
    assertRenderableScene(scene, modelPath);
    return SkeletonUtils.clone(scene);
  }, [scene]);
  const { actions, names } = useManagedAnimations(animations, cloned);

  useEffect(() => {
    const first = names[0];
    if (!first) return;
    const action = actions[first];
    if (!action) return;
    action.reset().fadeIn(0.2).play();
    return () => {
      action.fadeOut(0.2);
    };
  }, [actions, names]);

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

function ScoutMesh({ agent }: { agent: AgentState }) {
  const modelPath = "/models/scout.glb";
  const { scene, animations } = useGLTF(modelPath);
  const cloned = useMemo(() => {
    assertRenderableScene(scene, modelPath);
    return SkeletonUtils.clone(scene);
  }, [scene]);
  const { actions, names } = useManagedAnimations(animations, cloned);

  useEffect(() => {
    const first = names[0];
    if (!first) return;
    const action = actions[first];
    if (!action) return;
    action.reset().fadeIn(0.2).play();
    return () => {
      action.fadeOut(0.2);
    };
  }, [actions, names]);

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

function CollectorMesh({ agent, modelPath }: { agent: AgentState; modelPath: string }) {
  const { scene, animations } = useGLTF(modelPath);
  const cloned = useMemo(() => {
    assertRenderableScene(scene, modelPath);
    return SkeletonUtils.clone(scene);
  }, [modelPath, scene]);
  const { actions, names } = useManagedAnimations(animations, cloned);

  useEffect(() => {
    const first = names[0];
    if (!first) return;
    const action = actions[first];
    if (!action) return;
    action.reset().fadeIn(0.2).play();
    return () => {
      action.fadeOut(0.2);
    };
  }, [actions, names]);

  return (
    <TurnTowardVelocity>
      <primitive object={cloned} scale={COLLECTOR_BASE_SCALE} position={[0, COLLECTOR_Y_OFFSET, 0]} />
    </TurnTowardVelocity>
  );
}

// モデルの forward 方向に応じてヨーを補正する。
const FISH_YAW_OFFSET = Math.PI;
const FISH_BASE_SCALE = 7.5;

function FishMesh({ agent }: { agent: AgentState }) {
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
  );

  useEffect(() => {
    const first = names[0];
    if (!first) return;
    const action = actions[first];
    if (!action) return;
    action.reset().fadeIn(0.2).play();
    return () => {
      action.fadeOut(0.2);
    };
  }, [actions, names]);

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

function AgentNode({
  agent,
  cx,
  cz,
  registerAgentGroup,
  discovered,
}: {
  agent: AgentState;
  cx: number;
  cz: number;
  registerAgentGroup: (id: string, group: THREE.Group | null) => void;
  discovered: boolean;
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
      {agent.agent_type === "predator" && (
        <ModelErrorBoundary resetKey="/models/orca.glb">
          <Suspense fallback={null}>
            <OrcaPredator agent={agent} />
          </Suspense>
        </ModelErrorBoundary>
      )}
      {agent.agent_type === "scout" && (
        <ModelErrorBoundary resetKey="/models/scout.glb">
          <Suspense fallback={null}>
            <ScoutMesh agent={agent} />
          </Suspense>
        </ModelErrorBoundary>
      )}
      {agent.agent_type === "collector" && (
        <ModelErrorBoundary resetKey={collectorModelPath ?? "/models/collector.glb"}>
          <Suspense fallback={null}>
            <CollectorMesh agent={agent} modelPath={collectorModelPath ?? "/models/collector.glb"} />
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
            <FishMesh agent={agent} />
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
    </group>
  );
}

function yawOffsetForAgent(agent: AgentState): number {
  if (agent.agent_type === "predator") return ORCA_YAW_OFFSET;
  if (agent.agent_type === "scout") return SCOUT_YAW_OFFSET;
  if (agent.agent_type === "collector") return COLLECTOR_YAW_OFFSET;
  if (agent.agent_type === "marine_life") return FISH_YAW_OFFSET;
  return 0;
}

function AgentsLayer({
  agents,
  discoveredSet,
  cx,
  cz,
}: {
  agents: AgentState[];
  discoveredSet: Set<string>;
  cx: number;
  cz: number;
}) {
  const agentGroupsRef = useRef(new Map<string, THREE.Group>());

  const registerAgentGroup = useCallback((id: string, group: THREE.Group | null) => {
    if (group) {
      agentGroupsRef.current.set(id, group);
    } else {
      agentGroupsRef.current.delete(id);
    }
  }, []);

  const visibleAgents = useMemo(() => agents, [agents]);

  useFrame((_, delta) => {
    const alpha = 1 - Math.exp(-POSITION_FOLLOW_RATE * delta);
    const snapDistanceSq = POSITION_SNAP_DISTANCE * POSITION_SNAP_DISTANCE;

    for (const agent of visibleAgents) {
      const group = agentGroupsRef.current.get(agent.id);
      if (!group) continue;

      const wx = agent.x - cx;
      const wz = agent.y - cz;
      const y = agent.agent_type === "predator" ? 14 : 8;
      const dx = wx - group.position.x;
      const dy = y - group.position.y;
      const dz = wz - group.position.z;

      if (dx * dx + dy * dy + dz * dz > snapDistanceSq) {
        group.position.set(wx, y, wz);
      } else {
        group.position.x += dx * alpha;
        group.position.y += dy * alpha;
        group.position.z += dz * alpha;
      }

      const { vx, vy } = agent;
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
  const texture = useTexture("/assets/images/underwater-background.png");
  const { scene } = useThree();
  useMemo(() => {
    texture.colorSpace = THREE.SRGBColorSpace;
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
        dpr={[1, 1.5]}
      >
        <AnimationMixerRegistry>
          <CameraPresetController
            preset={cameraPreset}
            width={width}
            height={height}
            margin={margin}
          />
          <Suspense fallback={<color attach="background" args={["#0c4a72"]} />}>
            <SceneBackground />
          </Suspense>
          <ambientLight intensity={1.1} />
          <hemisphereLight args={["#bae6fd", "#0c2740", 0.8]} />
          <directionalLight position={[200, 400, 200]} intensity={1.6} color="#ffffff" />
          <directionalLight position={[-200, 200, -100]} intensity={0.7} color="#5eead4" />

          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
            <planeGeometry args={[width, height]} />
            <meshStandardMaterial
              color="#1a5e8a"
              metalness={0.15}
              roughness={0.7}
              transparent
              opacity={0.35}
            />
          </mesh>

          <FieldGrid width={width} height={height} divisions={20} />

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
          />
        </AnimationMixerRegistry>

      </ThreeCanvas>
    </div>
  );
}
