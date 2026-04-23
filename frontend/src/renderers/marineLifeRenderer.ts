import type { Renderer } from "../types";

const marineLifeRenderer: Renderer = {
  color: "#7dd3fc",
  size: 11,
  draw(ctx, size) {
    ctx.beginPath();
    ctx.ellipse(0, 0, size, size * 0.58, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(-size, 0);
    ctx.lineTo(-size * 1.45, -size * 0.55);
    ctx.lineTo(-size * 1.45, size * 0.55);
    ctx.closePath();
    ctx.fill();
  },
};

export default marineLifeRenderer;
