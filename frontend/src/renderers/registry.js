import fishRenderer from "./fishRenderer";
import plasticRenderer from "./plasticRenderer";
import predatorRenderer from "./predatorRenderer";

const renderers = {
  fish: fishRenderer,
  predator: predatorRenderer,
  plastic: plasticRenderer,
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

export function registerRenderer(agentType, renderer) {
  renderers[agentType] = renderer;
}
