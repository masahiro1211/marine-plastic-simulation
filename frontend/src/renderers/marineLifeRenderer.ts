import type { Renderer } from "../types";

const SPECIES_COLORS: Record<number, string> = {
  0: "#7dd3fc",
  1: "#86efac",
  2: "#fca5a5",
};

const marineLifeRenderer: Renderer = {
  color: "#7dd3fc",
  size: 11,
  draw(ctx, size, agent) {
    const speciesId = (agent.metadata?.species_id as number) ?? 0;
    ctx.fillStyle = SPECIES_COLORS[speciesId] ?? SPECIES_COLORS[0];

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
