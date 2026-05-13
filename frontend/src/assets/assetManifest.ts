import type { AssetManifest } from "./gltfTypes";

export const ASSET_MANIFEST: AssetManifest = {
  version: 1,
  agents: {
    scout: {
      agentType: "scout",
      gltfPath: "/assets/gltf/scout.glftest.gltf",
      animationClips: ["idle", "scan", "move"],
      budget: { maxBytes: 4096, maxNodes: 8, maxPrimitives: 8 },
      fallbackRenderer: "scout",
    },
    collector: {
      agentType: "collector",
      gltfPath: "/assets/gltf/collector.glftest.gltf",
      animationClips: ["idle", "move", "carry"],
      budget: { maxBytes: 4096, maxNodes: 8, maxPrimitives: 8 },
      fallbackRenderer: "collector",
    },
    marine_life: {
      agentType: "marine_life",
      gltfPath: "/assets/gltf/marine-life.glftest.gltf",
      animationClips: ["idle", "swim", "stress"],
      budget: { maxBytes: 4096, maxNodes: 8, maxPrimitives: 8 },
      fallbackRenderer: "marine_life",
    },
    trash: {
      agentType: "trash",
      gltfPath: "/assets/gltf/trash.glftest.gltf",
      animationClips: ["idle", "drift"],
      budget: { maxBytes: 4096, maxNodes: 8, maxPrimitives: 8 },
      fallbackRenderer: "trash",
    },
    predator: {
      agentType: "predator",
      gltfPath: "/assets/gltf/predator.glftest.gltf",
      animationClips: ["idle", "cruise", "chase"],
      budget: { maxBytes: 4096, maxNodes: 8, maxPrimitives: 8 },
      fallbackRenderer: "predator",
    },
  },
  stage: [
    {
      id: "ocean-background",
      type: "image",
      path: "/assets/images/ocean-stage.svg",
      x: 0,
      y: 0,
      width: 960,
      height: 640,
      opacity: 1,
      parallax: 0.2,
    },
    {
      id: "base-platform",
      type: "gltf",
      path: "/assets/gltf/base-platform.glftest.gltf",
      x: 480,
      y: 604,
      width: 180,
      height: 86,
      opacity: 1,
      parallax: 1,
      budget: { maxBytes: 4096, maxNodes: 8, maxPrimitives: 8 },
    },
  ],
};
