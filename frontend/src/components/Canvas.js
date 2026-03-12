import React, { useEffect, useRef } from "react";
import { getRenderer } from "../renderers/registry";

export default function Canvas({ agents, width = 800, height = 600 }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;

    // Background — ocean gradient
    const grad = ctx.createLinearGradient(0, 0, 0, height);
    grad.addColorStop(0, "#0d47a1");
    grad.addColorStop(1, "#1a237e");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);

    for (const agent of agents) {
      const renderer = getRenderer(agent.agent_type);

      ctx.save();
      ctx.translate(agent.x, agent.y);
      ctx.rotate(agent.angle);
      ctx.fillStyle = renderer.color;
      ctx.globalAlpha = 1.0;

      renderer.draw(ctx, renderer.size, agent);

      ctx.restore();
    }
  }, [agents, width, height]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      style={{ border: "2px solid #1565c0", borderRadius: 8 }}
    />
  );
}
