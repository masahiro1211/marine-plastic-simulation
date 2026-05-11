import { useEffect, useMemo, useRef } from "react";
import { Canvas as ThreeCanvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, useGLTF, useAnimations } from "@react-three/drei";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import * as THREE from "three";
import * as SkeletonUtils from "three/examples/jsm/utils/SkeletonUtils.js";
import type { AgentState, AgentType, BaseState } from "../types";

export type CameraPreset = "angle" | "top" | "side" | "low";

useGLTF.preload("/models/orca.glb");

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

function CollectorMesh({ agent }: { agent: AgentState }) {
  const ref = useRef<THREE.Group>(null);
  useFrame(() => {
    const g = ref.current;
    if (!g) return;
    const { vx, vy } = agent;
    if (vx * vx + vy * vy > 1e-3) {
      g.rotation.y = Math.atan2(vx, vy);
    }
  });
  const carrying = Boolean(agent.metadata?.carrying);
  return (
    <group ref={ref}>
      <mesh>
        <boxGeometry args={[20, 8, 12]} />
        <meshStandardMaterial color="#34d399" emissive="#047857" emissiveIntensity={0.3} />
      </mesh>
      {carrying && (
        <mesh position={[0, 8, 0]}>
          <sphereGeometry args={[3, 12, 12]} />
          <meshStandardMaterial color="#fbbf24" emissive="#fbbf24" emissiveIntensity={0.6} />
        </mesh>
      )}
    </group>
  );
}

function FishMesh({ agent }: { agent: AgentState }) {
  const ref = useRef<THREE.Group>(null);
  const speciesId = (agent.metadata?.species_id as number) ?? 0;
  const colors = ["#7dd3fc", "#86efac", "#fca5a5"];
  const color = colors[speciesId] ?? colors[0];

  useFrame(() => {
    const g = ref.current;
    if (!g) return;
    const { vx, vy } = agent;
    if (vx * vx + vy * vy > 1e-3) {
      g.rotation.y = Math.atan2(vx, vy);
    }
  });

  return (
    <group ref={ref} scale={agent.alive ? 1 : 0.4}>
      <mesh rotation={[0, Math.PI / 2, 0]}>
        <sphereGeometry args={[6, 12, 8]} />
        <meshStandardMaterial color={color} />
      </mesh>
      <mesh position={[-7, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
        <coneGeometry args={[4, 6, 4]} />
        <meshStandardMaterial color={color} />
      </mesh>
    </group>
  );
}

function TrashMesh() {
  return (
    <mesh rotation={[Math.random() * Math.PI, Math.random() * Math.PI, 0]}>
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
      {agent.agent_type === "trash" && <TrashMesh />}
    </group>
  );
}

function CameraPresetController({
  preset,
  controlsRef,
  width,
  height,
}: {
  preset: CameraPreset;
  controlsRef: React.MutableRefObject<OrbitControlsImpl | null>;
  width: number;
  height: number;
}) {
  const { camera } = useThree();
  useEffect(() => {
    const m = Math.max(width, height);
    const positions: Record<CameraPreset, [number, number, number]> = {
      angle: [0, m * 0.9, height * 0.7],
      top: [0, m * 1.3, 0.01],
      side: [m * 0.9, height * 0.25, 0],
      low: [0, height * 0.25, m * 0.9],
    };
    const [x, y, z] = positions[preset];
    camera.position.set(x, y, z);
    camera.lookAt(0, 0, 0);
    camera.updateProjectionMatrix();
    const controls = controlsRef.current;
    if (controls) {
      controls.target.set(0, 0, 0);
      controls.update();
    }
  }, [preset, camera, controlsRef, width, height]);
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
  const controlsRef = useRef<OrbitControlsImpl | null>(null);

  const visibleAgents = useMemo(
    () => agents.filter((a): a is AgentState & { agent_type: AgentType } => Boolean(a.agent_type)),
    [agents]
  );

  return (
    <div
      style={{ width, height }}
      className="border border-cyan-950 rounded-2xl shadow-2xl overflow-hidden bg-[#031624] relative"
    >
      <ThreeCanvas
        camera={{ position: [0, Math.max(width, height) * 0.9, height * 0.7], fov: 45 }}
        dpr={[1, 2]}
      >
        <CameraPresetController
          preset={cameraPreset}
          controlsRef={controlsRef}
          width={width}
          height={height}
        />
        <color attach="background" args={["#031624"]} />
        <fog attach="fog" args={["#031624", height * 0.8, height * 3]} />
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

        {visibleAgents.map((a) => (
          <AgentNode key={a.id} agent={a} cx={cx} cz={cz} />
        ))}

        <OrbitControls
          ref={controlsRef as React.Ref<OrbitControlsImpl>}
          enableDamping
          dampingFactor={0.08}
          maxPolarAngle={Math.PI / 2.05}
          minDistance={150}
          maxDistance={2500}
          enablePan
        />
      </ThreeCanvas>
      <div className="absolute bottom-2 left-3 text-[10px] text-cyan-200/70 pointer-events-none select-none">
        左ドラッグ: 回転 / 右ドラッグ: 移動 / ホイール: ズーム
      </div>
    </div>
  );
}
