import collectorRenderer from "./collectorRenderer";
import marineLifeRenderer from "./marineLifeRenderer";
import scoutRenderer from "./scoutRenderer";
import trashRenderer from "./trashRenderer";

const renderers = {
  scout: scoutRenderer,
  collector: collectorRenderer,
  marine_life: marineLifeRenderer,
  trash: trashRenderer,
};

const fallbackRenderer = {
  color: "#ffffff",
  size: 4,
  draw(ctx, size) {
    ctx.beginPath();
    ctx.arc(0, 0, size, 0, Math.PI * 2);
    ctx.fill();
  },
};

export function getRenderer(agentType) {
  return renderers[agentType] || fallbackRenderer;
}
