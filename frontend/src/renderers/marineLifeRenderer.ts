import type { Renderer } from "../types";

const marineLifeRenderer: Renderer = {
  color: "#7dd3fc",
  size: 11,
  draw(ctx, size, agent) {
    ctx.beginPath();
    ctx.ellipse(0, 0, size, size * 0.58, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(-size, 0);
    ctx.lineTo(-size * 1.45, -size * 0.55);
    ctx.lineTo(-size * 1.45, size * 0.55);
    ctx.closePath();
    ctx.fill();

    const stress = typeof agent.metadata.stress === "number" ? agent.metadata.stress : 0;
    if (stress > 5) {
      ctx.strokeStyle = "#f472b6";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, size * 1.35, 0, Math.PI * 2);
      ctx.stroke();
    }
  },
};

export default marineLifeRenderer;
