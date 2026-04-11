import type { AgentType, Renderer } from "../types";
import collectorRenderer from "./collectorRenderer";
import marineLifeRenderer from "./marineLifeRenderer";
import scoutRenderer from "./scoutRenderer";
import trashRenderer from "./trashRenderer";

const renderers: Record<AgentType, Renderer> = {
  scout: scoutRenderer,
  collector: collectorRenderer,
  marine_life: marineLifeRenderer,
  trash: trashRenderer,
};

const fallbackRenderer: Renderer = {
  color: "#ffffff",
  size: 4,
  draw(ctx, size) {
    ctx.beginPath();
    ctx.arc(0, 0, size, 0, Math.PI * 2);
    ctx.fill();
  },
};

export function getRenderer(agentType: AgentType): Renderer {
  return renderers[agentType] ?? fallbackRenderer;
}
