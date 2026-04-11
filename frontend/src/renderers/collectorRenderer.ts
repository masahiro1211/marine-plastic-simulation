import type { Renderer } from "../types";

const collectorRenderer: Renderer = {
  color: "#34d399",
  size: 12,
  draw(ctx, size, agent) {
    ctx.beginPath();
    ctx.roundRect(-size, -size * 0.6, size * 2, size * 1.2, 4);
    ctx.fill();

    if (agent.metadata.carrying) {
      ctx.fillStyle = "#fbbf24";
      ctx.beginPath();
      ctx.arc(-size * 0.2, 0, size * 0.28, 0, Math.PI * 2);
      ctx.fill();
    }
  },
};

export default collectorRenderer;
