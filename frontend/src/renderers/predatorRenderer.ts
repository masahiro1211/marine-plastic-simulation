import type { Renderer } from "../types";

const predatorRenderer: Renderer = {
  color: "#1f2937",
  size: 14,
  draw(ctx, size, agent) {
    const chasing = agent.metadata?.mode === "chase";
    ctx.fillStyle = chasing ? "#7f1d1d" : "#1f2937";
    ctx.beginPath();
    ctx.moveTo(size, 0);
    ctx.lineTo(-size * 0.7, size * 0.6);
    ctx.lineTo(-size * 0.4, 0);
    ctx.lineTo(-size * 0.7, -size * 0.6);
    ctx.closePath();
    ctx.fill();
  },
};

export default predatorRenderer;
