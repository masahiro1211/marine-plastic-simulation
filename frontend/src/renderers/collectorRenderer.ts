import type { Renderer } from "../types";

const collectorRenderer: Renderer = {
  color: "#34d399",
  size: 12,
  draw(ctx, size, agent) {
    ctx.beginPath();
    ctx.roundRect(-size, -size * 0.6, size * 2, size * 1.2, 4);
    ctx.fill();

    if (agent.metadata.carrying) {
      const carryingCount =
        typeof agent.metadata.carrying_count === "number"
          ? Math.max(1, agent.metadata.carrying_count)
          : 1;
      ctx.fillStyle = "#fbbf24";
      for (let i = 0; i < carryingCount; i++) {
        ctx.beginPath();
        ctx.arc(size * 1.25, (i - (carryingCount - 1) / 2) * size * 0.45, size * 0.25, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  },
};

export default collectorRenderer;
