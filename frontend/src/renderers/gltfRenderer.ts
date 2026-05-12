import type { AgentState } from "../types";
import type { LightweightGltfAsset, LightweightPrimitive } from "../assets/gltfTypes";

function drawPrimitive(ctx: CanvasRenderingContext2D, primitive: LightweightPrimitive) {
  ctx.fillStyle = primitive.fill;
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
    drawPrimitive(ctx, primitive);
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
    drawPrimitive(ctx, primitive);
  }
  ctx.restore();
}
