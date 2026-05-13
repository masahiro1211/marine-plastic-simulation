const fs = require("fs");
const path = require("path");

const projectRoot = path.resolve(__dirname, "..");
const publicRoot = path.join(projectRoot, "public");

const manifest = {
  agents: [
    {
      type: "scout",
      path: "/assets/gltf/fixtures/scout.glftest.gltf",
      clips: ["idle", "scan", "move"],
      maxBytes: 4096,
      maxNodes: 8,
      maxPrimitives: 8,
    },
    {
      type: "collector",
      path: "/assets/gltf/fixtures/collector.glftest.gltf",
      clips: ["idle", "move", "carry"],
      maxBytes: 4096,
      maxNodes: 8,
      maxPrimitives: 8,
    },
    {
      type: "marine_life",
      path: "/assets/gltf/fixtures/marine-life.glftest.gltf",
      clips: ["idle", "swim", "stress"],
      maxBytes: 4096,
      maxNodes: 8,
      maxPrimitives: 8,
    },
    {
      type: "trash",
      path: "/assets/gltf/fixtures/trash.glftest.gltf",
      clips: ["idle", "drift"],
      maxBytes: 4096,
      maxNodes: 8,
      maxPrimitives: 8,
    },
    {
      type: "predator",
      path: "/assets/gltf/fixtures/predator.glftest.gltf",
      clips: ["idle", "cruise", "chase"],
      maxBytes: 4096,
      maxNodes: 8,
      maxPrimitives: 8,
    },
  ],
  stage: [
    {
      id: "base-platform",
      path: "/assets/gltf/fixtures/base-platform.glftest.gltf",
      clips: ["idle"],
      maxBytes: 4096,
      maxNodes: 8,
      maxPrimitives: 8,
    },
  ],
  images: ["/assets/images/ocean-stage.svg"],
};

function readPublicFile(publicPath) {
  const filePath = path.join(publicRoot, publicPath.replace(/^\//, ""));
  return {
    filePath,
    text: fs.readFileSync(filePath, "utf8"),
    bytes: fs.statSync(filePath).size,
  };
}

function validateGltf(entry) {
  const { text, bytes } = readPublicFile(entry.path);
  const gltf = JSON.parse(text);
  const primitives = gltf.extras && gltf.extras.mps && gltf.extras.mps.primitives;
  const clips = gltf.extras && gltf.extras.mps && gltf.extras.mps.animationClips;
  const animations = Array.isArray(gltf.animations)
    ? gltf.animations.map((animation) => animation.name)
    : [];
  const nodes = Array.isArray(gltf.nodes) ? gltf.nodes : [];

  if (!gltf.asset || gltf.asset.version !== "2.0") {
    throw new Error(`${entry.path} is not a GLTF 2.0 asset`);
  }
  if (bytes > entry.maxBytes) {
    throw new Error(`${entry.path} is ${bytes} bytes, over ${entry.maxBytes}`);
  }
  if (nodes.length > entry.maxNodes) {
    throw new Error(`${entry.path} has ${nodes.length} nodes`);
  }
  if (!Array.isArray(primitives) || primitives.length === 0) {
    throw new Error(`${entry.path} has no lightweight render primitives`);
  }
  if (primitives.length > entry.maxPrimitives) {
    throw new Error(`${entry.path} has ${primitives.length} primitives`);
  }
  for (const clip of entry.clips) {
    if (!Array.isArray(clips) || !clips.includes(clip)) {
      throw new Error(`${entry.path} is missing mps animation clip ${clip}`);
    }
    if (!animations.includes(clip)) {
      throw new Error(`${entry.path} is missing GLTF animation ${clip}`);
    }
  }
}

for (const entry of manifest.agents) {
  validateGltf(entry);
}
for (const entry of manifest.stage) {
  validateGltf(entry);
}
for (const imagePath of manifest.images) {
  const { bytes } = readPublicFile(imagePath);
  if (bytes > 8192) {
    throw new Error(`${imagePath} is ${bytes} bytes, over 8192`);
  }
}

console.log("GLTF fixture assets are valid and within lightweight budgets.");
