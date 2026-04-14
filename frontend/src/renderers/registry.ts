import type { AgentType, Renderer } from "../types";
import collectorRenderer from "./collectorRenderer";
import marineLifeRenderer from "./marineLifeRenderer";
import scoutRenderer from "./scoutRenderer";
import trashRenderer from "./trashRenderer";

/**
 * Renderer lookup table keyed by backend agent type.
 */
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

/**
 * Resolve the renderer used for a given agent type.
 *
 * @param agentType Backend-provided agent type.
 * @returns Matching renderer or a generic fallback renderer.
 */
export function getRenderer(agentType: AgentType): Renderer {
  return renderers[agentType] ?? fallbackRenderer;
}
