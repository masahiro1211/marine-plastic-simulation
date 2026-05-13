import { useEffect, useMemo, useRef, useState } from "react";
import type { KeyboardEvent, WheelEvent } from "react";
import { ASSET_MANIFEST } from "../assets/assetManifest";
import { loadGltfAsset } from "../assets/gltfAssetLoader";
import type { LoadedGltfAsset, StageAssetDefinition } from "../assets/gltfTypes";
import { drawGltfAgent, drawGltfStageAsset } from "../renderers/gltfRenderer";
import { getRenderer } from "../renderers/registry";
import type { AgentState, AgentType, BaseState } from "../types";

interface CameraState {
  x: number;
  y: number;
  zoom: number;
}

/**
 * Paint the ocean background and base platform before agent rendering.
 *
 * @param ctx Active 2D drawing context.
 * @param base Base position and interaction radius.
 * @param width Canvas width.
 * @param height Canvas height.
 */
function drawBase(
  ctx: CanvasRenderingContext2D,
  base: BaseState | null,
  width: number,
  height: number,
  stageImages: Map<string, HTMLImageElement>,
  stageGltfs: Map<string, LoadedGltfAsset>
) {
  const seaGradient = ctx.createLinearGradient(0, 0, 0, height);
  seaGradient.addColorStop(0, "#031624");
  seaGradient.addColorStop(0.55, "#0b3a5a");
  seaGradient.addColorStop(1, "#0a6c74");
  ctx.fillStyle = seaGradient;
  ctx.fillRect(0, 0, width, height);

  for (const stageAsset of ASSET_MANIFEST.stage) {
    if (stageAsset.type !== "image") continue;
    const image = stageImages.get(stageAsset.id);
    if (!image) continue;
    ctx.save();
    ctx.globalAlpha = stageAsset.opacity ?? 1;
    ctx.drawImage(
      image,
      stageAsset.x,
      stageAsset.y,
      stageAsset.width,
      stageAsset.height
    );
    ctx.restore();
  }

  if (!base) return;

  ctx.fillStyle = "rgba(3, 10, 18, 0.82)";
  ctx.fillRect(0, height - 70, width, 70);

  ctx.fillStyle = "#d4a373";
  ctx.fillRect(base.x - 70, base.y - 18, 140, 30);
  ctx.fillStyle = "#f1f5f9";
  ctx.fillRect(base.x - 28, base.y - 42, 56, 24);
  ctx.fillStyle = "rgba(94, 234, 212, 0.18)";
  ctx.beginPath();
  ctx.arc(base.x, base.y, base.radius, 0, Math.PI * 2);
  ctx.fill();

  for (const stageAsset of ASSET_MANIFEST.stage) {
    if (stageAsset.type !== "gltf") continue;
    const loaded = stageGltfs.get(stageAsset.id);
    if (!loaded) continue;
    drawGltfStageAsset(
      ctx,
      loaded.gltf,
      stageAsset.x,
      stageAsset.y,
      stageAsset.width,
      stageAsset.height
    );
  }
}

function loadStageImage(stageAsset: StageAssetDefinition): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`Failed to load stage image ${stageAsset.path}`));
    image.src = stageAsset.path;
  });
}

interface CanvasProps {
  agents: AgentState[];
  base: BaseState;
  width?: number;
  height?: number;
}

export default function Canvas({
  agents,
  base,
  width = 960,
  height = 640,
}: CanvasProps) {
  /**
   * Draw the latest simulation frame whenever agents or bounds change.
   */
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const dragRef = useRef<{ x: number; y: number } | null>(null);
  const [camera, setCamera] = useState<CameraState>({ x: 0, y: 0, zoom: 1 });
  const [agentAssets, setAgentAssets] = useState<
    Partial<Record<AgentType, LoadedGltfAsset>>
  >({});
  const [stageImages, setStageImages] = useState<Map<string, HTMLImageElement>>(
    () => new Map()
  );
  const [stageGltfs, setStageGltfs] = useState<Map<string, LoadedGltfAsset>>(
    () => new Map()
  );

  const stageImageMap = useMemo(() => stageImages, [stageImages]);
  const stageGltfMap = useMemo(() => stageGltfs, [stageGltfs]);

  useEffect(() => {
    let active = true;

    void Promise.all(
      Object.values(ASSET_MANIFEST.agents).map((definition) =>
        loadGltfAsset(definition).then((loaded) => [definition.agentType, loaded] as const)
      )
    )
      .then((loadedAssets) => {
        if (!active) return;
        setAgentAssets(Object.fromEntries(loadedAssets) as Partial<Record<AgentType, LoadedGltfAsset>>);
      })
      .catch(() => {});

    void Promise.all(
      ASSET_MANIFEST.stage
        .filter((stageAsset) => stageAsset.type === "image")
        .map((stageAsset) =>
          loadStageImage(stageAsset).then((image) => [stageAsset.id, image] as const)
        )
    )
      .then((loadedImages) => {
        if (!active) return;
        setStageImages(new Map(loadedImages));
      })
      .catch(() => {});

    void Promise.all(
      ASSET_MANIFEST.stage
        .filter((stageAsset) => stageAsset.type === "gltf")
        .map((stageAsset) =>
          loadGltfAsset(stageAsset).then((loaded) => [stageAsset.id, loaded] as const)
        )
    )
      .then((loadedStageGltfs) => {
        if (!active) return;
        setStageGltfs(new Map(loadedStageGltfs));
      })
      .catch(() => {});

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let animationFrame = 0;

    const draw = (timestamp: number) => {
      const ctx = canvasRef.current?.getContext("2d");
      if (!ctx) {
        animationFrame = requestAnimationFrame(draw);
        return;
      }

      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, width, height);
      ctx.save();
      ctx.translate(width / 2, height / 2);
      ctx.scale(camera.zoom, camera.zoom);
      ctx.translate(-width / 2 + camera.x, -height / 2 + camera.y);

      drawBase(ctx, base, width, height, stageImageMap, stageGltfMap);

      for (const agent of agents) {
        const renderer = getRenderer(agent.agent_type);
        const asset = agentAssets[agent.agent_type];
        const angle = Math.atan2(agent.vy || 0, agent.vx || 1);

        ctx.save();
        ctx.translate(agent.x, agent.y);
        ctx.rotate(angle);
        if (asset) {
          drawGltfAgent(ctx, asset.gltf, agent, timestamp);
        } else {
          ctx.fillStyle = renderer.color;
          renderer.draw(ctx, renderer.size, agent);
        }
        ctx.restore();
      }
      ctx.restore();

      animationFrame = requestAnimationFrame(draw);
    };

    animationFrame = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animationFrame);
  }, [
    agents,
    agentAssets,
    base,
    camera,
    height,
    stageGltfMap,
    stageImageMap,
    width,
  ]);

  const handleWheel = (event: WheelEvent<HTMLCanvasElement>) => {
    event.preventDefault();
    setCamera((current) => ({
      ...current,
      zoom: Math.min(2.5, Math.max(0.6, current.zoom - event.deltaY * 0.001)),
    }));
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLCanvasElement>) => {
    const step = event.shiftKey ? 48 : 24;
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      setCamera((current) => ({ ...current, x: current.x + step }));
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      setCamera((current) => ({ ...current, x: current.x - step }));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setCamera((current) => ({ ...current, y: current.y + step }));
    } else if (event.key === "ArrowDown") {
      event.preventDefault();
      setCamera((current) => ({ ...current, y: current.y - step }));
    } else if (event.key === "+" || event.key === "=") {
      event.preventDefault();
      setCamera((current) => ({ ...current, zoom: Math.min(2.5, current.zoom + 0.1) }));
    } else if (event.key === "-") {
      event.preventDefault();
      setCamera((current) => ({ ...current, zoom: Math.max(0.6, current.zoom - 0.1) }));
    } else if (event.key === "0") {
      event.preventDefault();
      setCamera({ x: 0, y: 0, zoom: 1 });
    }
  };

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      tabIndex={0}
      onWheel={handleWheel}
      onKeyDown={handleKeyDown}
      onMouseDown={(event) => {
        dragRef.current = { x: event.clientX, y: event.clientY };
      }}
      onMouseLeave={() => {
        dragRef.current = null;
      }}
      onMouseUp={() => {
        dragRef.current = null;
      }}
      onMouseMove={(event) => {
        if (!dragRef.current) return;
        const dx = (event.clientX - dragRef.current.x) / camera.zoom;
        const dy = (event.clientY - dragRef.current.y) / camera.zoom;
        dragRef.current = { x: event.clientX, y: event.clientY };
        setCamera((current) => ({ ...current, x: current.x + dx, y: current.y + dy }));
      }}
      className="border border-cyan-950 rounded-2xl shadow-2xl max-w-full h-auto"
    />
  );
}
