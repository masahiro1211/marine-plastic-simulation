import { useEffect, useMemo, useRef } from "react";
import { Canvas as ThreeCanvas, useFrame, useThree } from "@react-three/fiber";
import { useGLTF, useAnimations } from "@react-three/drei";
import * as THREE from "three";
import * as SkeletonUtils from "three/examples/jsm/utils/SkeletonUtils.js";
import type { AgentState, BaseState } from "../types";

export type CameraPreset = "angle" | "top";

useGLTF.preload("/models/orca.glb");
useGLTF.preload("/models/collector.glb");
useGLTF.preload("/models/fish.glb");

// モデルの forward 方向に応じてヨーを補正する。
// Blender の +Y forward でエクスポートしている場合は 0 のまま。
// 横向き／逆向きで出ている場合は Math.PI / 2 や Math.PI を試す。
const ORCA_YAW_OFFSET = Math.PI;

const ORCA_BASE_SCALE = 4.5;

function OrcaPredator({ agent }: { agent: AgentState }) {
  const ref = useRef<THREE.Group>(null);
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

  useFrame(() => {
    const g = ref.current;
    if (!g) return;
    const { vx, vy } = agent;
    if (vx * vx + vy * vy > 1e-3) {
      const target = Math.atan2(vx, vy) + ORCA_YAW_OFFSET;
      const cur = g.rotation.y;
      let diff = target - cur;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      g.rotation.y = cur + diff * 0.2;
    }
  });

  const chasing = agent.metadata?.mode === "chase";
  const scale = chasing ? ORCA_BASE_SCALE * 1.1 : ORCA_BASE_SCALE;

  return <primitive ref={ref} object={cloned} scale={scale} />;
}

function ScoutMesh({ agent }: { agent: AgentState }) {
  const ref = useRef<THREE.Group>(null);
  useFrame(() => {
    const g = ref.current;
    if (!g) return;
    const { vx, vy } = agent;
    if (vx * vx + vy * vy > 1e-3) {
      g.rotation.y = Math.atan2(vx, vy);
    }
  });
  return (
    <group ref={ref}>
      <mesh>
        <coneGeometry args={[5, 14, 4]} />
        <meshStandardMaterial color="#38bdf8" emissive="#0284c7" emissiveIntensity={0.4} />
      </mesh>
    </group>
  );
}

// モデルの forward 方向に応じてヨーを補正する。Blender の +Y forward なら 0。
const COLLECTOR_YAW_OFFSET = 0;
const COLLECTOR_BASE_SCALE = 9;
const COLLECTOR_Y_OFFSET = 0;

function CollectorMesh({ agent }: { agent: AgentState }) {
  const ref = useRef<THREE.Group>(null);
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

  useFrame(() => {
    const g = ref.current;
    if (!g) return;
    const { vx, vy } = agent;
    if (vx * vx + vy * vy > 1e-3) {
      const target = Math.atan2(vx, vy) + COLLECTOR_YAW_OFFSET;
      const cur = g.rotation.y;
      let diff = target - cur;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      g.rotation.y = cur + diff * 0.2;
    }
  });

  const carrying = Boolean(agent.metadata?.carrying);
  return (
    <group ref={ref}>
      <primitive object={cloned} scale={COLLECTOR_BASE_SCALE} position={[0, COLLECTOR_Y_OFFSET, 0]} />
      {carrying && (
        <mesh position={[0, 14, 0]}>
          <sphereGeometry args={[3, 12, 12]} />
          <meshStandardMaterial color="#fbbf24" emissive="#fbbf24" emissiveIntensity={0.6} />
        </mesh>
      )}
    </group>
  );
}

// モデルの forward 方向に応じてヨーを補正する。
const FISH_YAW_OFFSET = Math.PI;
const FISH_BASE_SCALE = 5;

function FishMesh({ agent }: { agent: AgentState }) {
  const ref = useRef<THREE.Group>(null);
  const { scene, animations } = useGLTF("/models/fish.glb");
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

  useFrame(() => {
    const g = ref.current;
    if (!g) return;
    const { vx, vy } = agent;
    if (vx * vx + vy * vy > 1e-3) {
      const target = Math.atan2(vx, vy) + FISH_YAW_OFFSET;
      const cur = g.rotation.y;
      let diff = target - cur;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      g.rotation.y = cur + diff * 0.2;
    }
  });

  const scale = (agent.alive ? 1 : 0.4) * FISH_BASE_SCALE;

  return (
    <group ref={ref} scale={scale}>
      <primitive object={cloned} />
    </group>
  );
}

function hashAgentId(id: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < id.length; i++) {
    h = Math.imul(h ^ id.charCodeAt(i), 16777619);
  }
  return h >>> 0;
}

function TrashMesh({ id }: { id: string }) {
  const rotation = useMemo<[number, number, number]>(() => {
    const h = hashAgentId(id);
    const r1 = (h & 0xffff) / 0xffff;
    const r2 = ((h >>> 16) & 0xffff) / 0xffff;
    return [r1 * Math.PI, r2 * Math.PI, 0];
  }, [id]);
  return (
    <mesh rotation={rotation}>
      <boxGeometry args={[6, 6, 6]} />
      <meshStandardMaterial color="#fb923c" roughness={0.9} />
    </mesh>
  );
}

function AgentNode({ agent, cx, cz }: { agent: AgentState; cx: number; cz: number }) {
  const wx = agent.x - cx;
  const wz = agent.y - cz;
  const y = agent.agent_type === "predator" ? 14 : 8;

  return (
    <group position={[wx, y, wz]}>
      {agent.agent_type === "predator" && <OrcaPredator agent={agent} />}
      {agent.agent_type === "scout" && <ScoutMesh agent={agent} />}
      {agent.agent_type === "collector" && <CollectorMesh agent={agent} />}
      {agent.agent_type === "marine_life" && <FishMesh agent={agent} />}
      {agent.agent_type === "trash" && <TrashMesh id={agent.id} />}
    </group>
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
  width?: number;
  height?: number;
  cameraPreset?: CameraPreset;
}

export default function Canvas3D({
  agents,
  base,
  width = 960,
  height = 640,
  cameraPreset = "angle",
}: Canvas3DProps) {
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
      className="border border-cyan-950 rounded-2xl shadow-2xl overflow-hidden bg-[#031624] relative"
    >
      <ThreeCanvas
        camera={{ position: [0, defaultDist * 0.85, defaultDist * 0.7], fov: 45, near: 1, far: sceneSize * 20 }}
        dpr={[1, 2]}
      >
        <CameraPresetController
          preset={cameraPreset}
          width={width}
          height={height}
          margin={margin}
        />
        <color attach="background" args={["#031624"]} />
        <ambientLight intensity={0.55} />
        <directionalLight position={[200, 400, 200]} intensity={1.1} castShadow />
        <directionalLight position={[-200, 200, -100]} intensity={0.4} color="#5eead4" />

        <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <planeGeometry args={[width, height]} />
          <meshStandardMaterial
            color="#0b3a5a"
            metalness={0.15}
            roughness={0.7}
          />
        </mesh>

        <gridHelper
          args={[Math.max(width, height), 20, "#1e3a5f", "#0f2a4a"]}
          position={[0, 0.1, 0]}
        />

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

        {agents.map((a) => (
          <AgentNode key={a.id} agent={a} cx={cx} cz={cz} />
        ))}

      </ThreeCanvas>
    </div>
  );
}
