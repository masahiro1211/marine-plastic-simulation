import { Component, Suspense, useEffect, useMemo, useRef, type ReactNode } from "react";
import { Canvas as ThreeCanvas, useFrame, useThree } from "@react-three/fiber";
import { useGLTF, useAnimations, useTexture } from "@react-three/drei";
import * as THREE from "three";
import * as SkeletonUtils from "three/examples/jsm/utils/SkeletonUtils.js";
import type { AgentState, BaseState } from "../types";

export type CameraPreset = "angle" | "top";

useGLTF.preload("/models/orca.glb");
useGLTF.preload("/models/collector.glb");
useGLTF.preload("/models/fish.glb");
useGLTF.preload("/models/fish_2.glb");
useGLTF.preload("/models/fish_3.glb");
useGLTF.preload("/models/scout.glb");
useGLTF.preload("/models/can.glb");
useGLTF.preload("/models/plastic_bottle.glb");

const FISH_MODEL_BY_SPECIES: Record<number, string> = {
  0: "/models/fish.glb",
  1: "/models/fish_2.glb",
  2: "/models/fish_3.glb",
};

const CAN_SCALE = 140;
const BOTTLE_SCALE = 70;
const CARRIED_CAN_SCALE = 56;
const CARRIED_BOTTLE_SCALE = 34;

// モデルの forward 方向に応じてヨーを補正する。
// Blender の +Y forward でエクスポートしている場合は 0 のまま。
// 横向き／逆向きで出ている場合は Math.PI / 2 や Math.PI を試す。
const ORCA_YAW_OFFSET = Math.PI;

const ORCA_BASE_SCALE = 4.5;
const POSITION_FOLLOW_RATE = 18;
const POSITION_SNAP_DISTANCE = 180;

class ModelErrorBoundary extends Component<
  { children: ReactNode; fallback: ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    return this.state.hasError ? this.props.fallback : this.props.children;
  }
}

function TurnTowardVelocity({
  agent,
  yawOffset = 0,
  children,
}: {
  agent: AgentState;
  yawOffset?: number;
  children: ReactNode;
}) {
  const ref = useRef<THREE.Group>(null);
  useFrame(() => {
    const g = ref.current;
    if (!g) return;
    const { vx, vy } = agent;
    if (vx * vx + vy * vy > 1e-3) {
      const target = Math.atan2(vx, vy) + yawOffset;
      const cur = g.rotation.y;
      let diff = target - cur;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      g.rotation.y = cur + diff * 0.2;
    }
  });

  return <group ref={ref}>{children}</group>;
}

function OrcaPredator({ agent }: { agent: AgentState }) {
  const { scene, animations } = useGLTF("/models/orca.glb");
  const cloned = useMemo(() => SkeletonUtils.clone(scene), [scene]);
  const { actions, names } = useAnimations(animations, cloned);

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
    <TurnTowardVelocity agent={agent} yawOffset={ORCA_YAW_OFFSET}>
      <primitive object={cloned} scale={scale} />
    </TurnTowardVelocity>
  );
}

const SCOUT_YAW_OFFSET = Math.PI;
const SCOUT_BASE_SCALE = 4;

function ScoutMesh({ agent }: { agent: AgentState }) {
  const { scene, animations } = useGLTF("/models/scout.glb");
  const cloned = useMemo(() => SkeletonUtils.clone(scene), [scene]);
  const { actions, names } = useAnimations(animations, cloned);

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
    <TurnTowardVelocity agent={agent} yawOffset={SCOUT_YAW_OFFSET}>
      <primitive object={cloned} scale={SCOUT_BASE_SCALE} />
    </TurnTowardVelocity>
  );
}

// モデルの forward 方向に応じてヨーを補正する。Blender の +Y forward なら 0。
const COLLECTOR_YAW_OFFSET = 0;
const COLLECTOR_BASE_SCALE = 9;
const COLLECTOR_Y_OFFSET = 0;

function CollectorMesh({ agent }: { agent: AgentState }) {
  const { scene, animations } = useGLTF("/models/collector.glb");
  const cloned = useMemo(() => SkeletonUtils.clone(scene), [scene]);
  const { actions, names } = useAnimations(animations, cloned);

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

  const carrying = Boolean(agent.metadata?.carrying);
  return (
    <TurnTowardVelocity agent={agent} yawOffset={COLLECTOR_YAW_OFFSET}>
      <primitive object={cloned} scale={COLLECTOR_BASE_SCALE} position={[0, COLLECTOR_Y_OFFSET, 0]} />
      {carrying && (
        <CarriedTrashMesh id={String(agent.metadata?.carrying_trash_id ?? agent.id)} />
      )}
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
  const cloned = useMemo(() => SkeletonUtils.clone(scene), [scene]);
  const { actions, names } = useAnimations(animations, cloned);

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
    <TurnTowardVelocity agent={agent} yawOffset={FISH_YAW_OFFSET}>
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

function TrashMesh({ id, discovered }: { id: string; discovered: boolean }) {
  const canGltf = useGLTF("/models/can.glb");
  const bottleGltf = useGLTF("/models/plastic_bottle.glb");
  const h = hashAgentId(id);
  const useCan = (h & 1) === 0;
  const sourceScene = useCan ? canGltf.scene : bottleGltf.scene;
  const scale = useCan ? CAN_SCALE : BOTTLE_SCALE;
  const cloned = useMemo(() => SkeletonUtils.clone(sourceScene), [sourceScene]);
  const rotationY = (((h >>> 1) & 0xffff) / 0xffff) * Math.PI * 2;

  return (
    <group>
      <primitive object={cloned} rotation={[0, rotationY, 0]} scale={scale} />
      {discovered && (
        <mesh position={[0, -6, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[14, 18, 48]} />
          <meshBasicMaterial color="#ef4444" transparent opacity={0.85} side={THREE.DoubleSide} />
        </mesh>
      )}
    </group>
  );
}

function CarriedTrashMesh({ id }: { id: string }) {
  const canGltf = useGLTF("/models/can.glb");
  const bottleGltf = useGLTF("/models/plastic_bottle.glb");
  const h = hashAgentId(id);
  const useCan = (h & 1) === 0;
  const sourceScene = useCan ? canGltf.scene : bottleGltf.scene;
  const cloned = useMemo(() => SkeletonUtils.clone(sourceScene), [sourceScene]);
  const scale = useCan ? CARRIED_CAN_SCALE : CARRIED_BOTTLE_SCALE;
  const rotationY = (((h >>> 1) & 0xffff) / 0xffff) * Math.PI * 2;

  return (
    <group position={[0, 17, 0]} rotation={[0.25, rotationY, -0.12]}>
      <primitive object={cloned} scale={scale} />
    </group>
  );
}

function TrashFallback({ id, discovered }: { id: string; discovered: boolean }) {
  const h = hashAgentId(id);
  const color = (h & 1) === 0 ? "#f97316" : "#facc15";
  const rotation = useMemo<[number, number, number]>(() => {
    const r1 = (h & 0xffff) / 0xffff;
    const r2 = ((h >>> 16) & 0xffff) / 0xffff;
    return [r1 * Math.PI, r2 * Math.PI, 0];
  }, [h]);

  return (
    <group>
      <mesh rotation={rotation}>
        <boxGeometry args={[7, 5, 10]} />
        <meshStandardMaterial color={color} roughness={0.85} metalness={0.05} />
      </mesh>
      {discovered && (
        <mesh position={[0, -6, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[14, 18, 48]} />
          <meshBasicMaterial color="#ef4444" transparent opacity={0.85} side={THREE.DoubleSide} />
        </mesh>
      )}
    </group>
  );
}

function AgentNode({
  agent,
  cx,
  cz,
  discovered,
}: {
  agent: AgentState;
  cx: number;
  cz: number;
  discovered: boolean;
}) {
  const ref = useRef<THREE.Group>(null);
  const wx = agent.x - cx;
  const wz = agent.y - cz;
  const y = agent.agent_type === "predator" ? 14 : 8;
  const initialPosition = useMemo<[number, number, number]>(
    () => [wx, y, wz],
    []
  );

  useFrame((_, delta) => {
    const group = ref.current;
    if (!group) return;
    const dx = wx - group.position.x;
    const dy = y - group.position.y;
    const dz = wz - group.position.z;
    const snapDistanceSq = POSITION_SNAP_DISTANCE * POSITION_SNAP_DISTANCE;
    if (dx * dx + dy * dy + dz * dz > snapDistanceSq) {
      group.position.set(wx, y, wz);
      return;
    }
    const alpha = 1 - Math.exp(-POSITION_FOLLOW_RATE * delta);
    group.position.x += dx * alpha;
    group.position.y += dy * alpha;
    group.position.z += dz * alpha;
  });

  return (
    <group ref={ref} position={initialPosition}>
      {agent.agent_type === "predator" && (
        <ModelErrorBoundary fallback={<PredatorFallback agent={agent} />}>
          <OrcaPredator agent={agent} />
        </ModelErrorBoundary>
      )}
      {agent.agent_type === "scout" && (
        <ModelErrorBoundary fallback={<ScoutFallback agent={agent} />}>
          <ScoutMesh agent={agent} />
        </ModelErrorBoundary>
      )}
      {agent.agent_type === "collector" && (
        <ModelErrorBoundary fallback={<CollectorFallback agent={agent} />}>
          <CollectorMesh agent={agent} />
        </ModelErrorBoundary>
      )}
      {agent.agent_type === "marine_life" && (
        <ModelErrorBoundary fallback={<FishFallback agent={agent} />}>
          <FishMesh agent={agent} />
        </ModelErrorBoundary>
      )}
      {agent.agent_type === "trash" && (
        <ModelErrorBoundary fallback={<TrashFallback id={agent.id} discovered={discovered} />}>
          <TrashMesh id={agent.id} discovered={discovered} />
        </ModelErrorBoundary>
      )}
    </group>
  );
}

function ScoutFallback({ agent }: { agent: AgentState }) {
  return (
    <TurnTowardVelocity agent={agent}>
      <mesh>
        <coneGeometry args={[5, 14, 4]} />
        <meshStandardMaterial color="#38bdf8" emissive="#0284c7" emissiveIntensity={0.4} />
      </mesh>
    </TurnTowardVelocity>
  );
}

function PredatorFallback({ agent }: { agent: AgentState }) {
  const chasing = agent.metadata?.mode === "chase";
  return (
    <TurnTowardVelocity agent={agent} yawOffset={Math.PI}>
      <mesh scale={chasing ? 1.15 : 1}>
        <coneGeometry args={[11, 34, 5]} />
        <meshStandardMaterial color={chasing ? "#991b1b" : "#334155"} roughness={0.65} />
      </mesh>
    </TurnTowardVelocity>
  );
}

function CollectorFallback({ agent }: { agent: AgentState }) {
  const carrying = Boolean(agent.metadata?.carrying);
  return (
    <TurnTowardVelocity agent={agent}>
      <mesh>
        <boxGeometry args={[20, 8, 12]} />
        <meshStandardMaterial color="#34d399" emissive="#047857" emissiveIntensity={0.25} />
      </mesh>
      {carrying && (
        <mesh position={[0, 10, 0]} rotation={[0.3, Math.PI / 5, -0.2]}>
          <boxGeometry args={[10, 4, 5]} />
          <meshStandardMaterial color="#f97316" roughness={0.85} metalness={0.08} />
        </mesh>
      )}
    </TurnTowardVelocity>
  );
}

function FishFallback({ agent }: { agent: AgentState }) {
  const speciesId = (agent.metadata?.species_id as number) ?? 0;
  const colors = ["#7dd3fc", "#86efac", "#fca5a5"];
  const color = colors[speciesId] ?? colors[0];
  return (
    <TurnTowardVelocity agent={agent}>
      <group scale={agent.alive ? 1.5 : 0.6}>
        <mesh rotation={[0, Math.PI / 2, 0]}>
          <sphereGeometry args={[6, 12, 8]} />
          <meshStandardMaterial color={color} />
        </mesh>
        <mesh position={[-7, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
          <coneGeometry args={[4, 6, 4]} />
          <meshStandardMaterial color={color} />
        </mesh>
      </group>
    </TurnTowardVelocity>
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

        <Suspense fallback={null}>
          {agents.map((a) => (
            <AgentNode
              key={a.id}
              agent={a}
              cx={cx}
              cz={cz}
              discovered={a.agent_type === "trash" && discoveredSet.has(a.id)}
            />
          ))}
        </Suspense>

      </ThreeCanvas>
    </div>
  );
}
