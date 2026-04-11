import React, { useEffect, useRef } from "react";
import { getRenderer } from "../renderers/registry";

function drawBase(ctx, base, width, height) {
  if (!base) return;

  const seaGradient = ctx.createLinearGradient(0, 0, 0, height);
  seaGradient.addColorStop(0, "#031624");
  seaGradient.addColorStop(0.55, "#0b3a5a");
  seaGradient.addColorStop(1, "#0a6c74");
  ctx.fillStyle = seaGradient;
  ctx.fillRect(0, 0, width, height);

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
}

export default function Canvas({ agents, base, width = 960, height = 640 }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;

    drawBase(ctx, base, width, height);

    for (const agent of agents) {
      const renderer = getRenderer(agent.agent_type);
      const angle = Math.atan2(agent.vy || 0, agent.vx || 1);

      ctx.save();
      ctx.translate(agent.x, agent.y);
      ctx.rotate(angle);
      ctx.fillStyle = renderer.color;
      renderer.draw(ctx, renderer.size, agent);
      ctx.restore();
    }
  }, [agents, base, width, height]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className="border border-cyan-950 rounded-2xl shadow-2xl"
    />
  );
}
