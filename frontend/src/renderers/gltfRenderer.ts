import type { AgentState } from "../types";
import type { LightweightGltfAsset, LightweightPrimitive } from "../assets/gltfTypes";

const MARINE_LIFE_SPECIES_COLORS: Record<number, string> = {
  0: "#7dd3fc",
  1: "#86efac",
  2: "#fca5a5",
};

function getRuntimeFill(agent: AgentState, primitive: LightweightPrimitive) {
  if (
    agent.agent_type === "marine_life" &&
    (primitive.fill === "#7dd3fc" ||
      primitive.fill === "#86efac" ||
      primitive.fill === "#fca5a5")
  ) {
    const speciesId = (agent.metadata?.species_id as number) ?? 0;
    return MARINE_LIFE_SPECIES_COLORS[speciesId] ?? MARINE_LIFE_SPECIES_COLORS[0];
  }

  if (agent.agent_type === "predator" && agent.metadata?.mode === "chase") {
    if (primitive.fill === "#1f2937") return "#7f1d1d";
    if (primitive.fill === "#374151") return "#991b1b";
  }

  return primitive.fill;
}

function drawPrimitive(
  ctx: CanvasRenderingContext2D,
  primitive: LightweightPrimitive,
  fill: string
) {
  ctx.fillStyle = fill;
  if (primitive.stroke) {
    ctx.strokeStyle = primitive.stroke;
    ctx.lineWidth = primitive.lineWidth ?? 1;
  }

  if (primitive.kind === "polygon" && primitive.points?.length) {
    ctx.beginPath();
    ctx.moveTo(primitive.points[0][0], primitive.points[0][1]);
    for (const [x, y] of primitive.points.slice(1)) {
      ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();
    if (primitive.stroke) ctx.stroke();
    return;
  }

  if (primitive.kind === "ellipse") {
    ctx.beginPath();
    ctx.ellipse(
      primitive.x ?? 0,
      primitive.y ?? 0,
      primitive.radiusX ?? 4,
      primitive.radiusY ?? 4,
      0,
      0,
      Math.PI * 2
    );
    ctx.fill();
    if (primitive.stroke) ctx.stroke();
    return;
  }

  if (primitive.kind === "rect") {
    const width = primitive.width ?? 8;
    const height = primitive.height ?? 8;
    ctx.fillRect(
      primitive.x ?? -width / 2,
      primitive.y ?? -height / 2,
      width,
      height
    );
    if (primitive.stroke) {
      ctx.strokeRect(
        primitive.x ?? -width / 2,
        primitive.y ?? -height / 2,
        width,
        height
      );
    }
  }
}

function applyClipTransform(
  ctx: CanvasRenderingContext2D,
  asset: LightweightGltfAsset,
  agent: AgentState,
  frameTime: number
) {
  const clips = asset.extras?.mps?.animationClips ?? [];
  const phase = frameTime / 1000;

  if (clips.includes("scan") && agent.agent_type === "scout") {
    ctx.rotate(Math.sin(phase * 4) * 0.08);
  }
  if (clips.includes("carry") && agent.metadata.carrying) {
    ctx.translate(0, Math.sin(phase * 8) * 1.5);
  }
  if (clips.includes("stress")) {
    const stress = typeof agent.metadata.stress === "number" ? agent.metadata.stress : 0;
    if (stress > 5) ctx.scale(1 + Math.sin(phase * 12) * 0.04, 1);
  }
  if (clips.includes("drift") && agent.agent_type === "trash") {
    ctx.rotate(Math.sin(phase * 2) * 0.14);
  }
  if (clips.includes("chase") && agent.agent_type === "predator") {
    const chasing = agent.metadata?.mode === "chase";
    if (chasing) ctx.scale(1.12 + Math.sin(phase * 10) * 0.03, 1);
  }
}

function drawCollectorCarryIndicator(ctx: CanvasRenderingContext2D) {
  ctx.save();
  ctx.fillStyle = "#fbbf24";
  ctx.strokeStyle = "#92400e";
  ctx.lineWidth = 1.5;

  ctx.beginPath();
  ctx.arc(-3, 0, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = "#fef3c7";
  ctx.beginPath();
  ctx.arc(-4.2, -1.4, 1.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

export function drawGltfAgent(
  ctx: CanvasRenderingContext2D,
  asset: LightweightGltfAsset,
  agent: AgentState,
  frameTime: number
) {
  const primitives = asset.extras?.mps?.primitives ?? [];
  const scale = asset.extras?.mps?.scale ?? 1;

  ctx.save();
  ctx.scale(scale, scale);
  applyClipTransform(ctx, asset, agent, frameTime);
  for (const primitive of primitives) {
    drawPrimitive(ctx, primitive, getRuntimeFill(agent, primitive));
  }
  if (agent.agent_type === "collector" && agent.metadata.carrying) {
    drawCollectorCarryIndicator(ctx);
  }
  ctx.restore();
}

export function drawGltfStageAsset(
  ctx: CanvasRenderingContext2D,
  asset: LightweightGltfAsset,
  x: number,
  y: number,
  width: number,
  height: number
) {
  const primitives = asset.extras?.mps?.primitives ?? [];
  const scale = asset.extras?.mps?.scale ?? 1;

  ctx.save();
  ctx.translate(x, y);
  ctx.scale(width / 180, height / 86);
  ctx.scale(scale, scale);
  for (const primitive of primitives) {
    drawPrimitive(ctx, primitive, primitive.fill);
  }
  ctx.restore();
}
