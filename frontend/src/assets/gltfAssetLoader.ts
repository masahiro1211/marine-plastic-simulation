import type {
  AgentAssetDefinition,
  LoadedGltfAsset,
  StageAssetDefinition,
} from "./gltfTypes";

type GltfDefinition = AgentAssetDefinition | StageAssetDefinition;

const gltfCache = new Map<string, Promise<LoadedGltfAsset>>();

function getBudget(definition: GltfDefinition) {
  return "budget" in definition ? definition.budget : undefined;
}

function getPath(definition: GltfDefinition) {
  return "gltfPath" in definition ? definition.gltfPath : definition.path;
}

/**
 * Fetch and validate a lightweight GLTF asset before rendering.
 *
 * @param definition Manifest entry that points at a GLTF file.
 * @returns Loaded and budget-checked GLTF payload.
 */
export function loadGltfAsset(
  definition: GltfDefinition
): Promise<LoadedGltfAsset> {
  const path = getPath(definition);
  const cached = gltfCache.get(path);
  if (cached) return cached;

  const promise = fetch(path)
    .then(async (response) => {
      if (!response.ok) {
        throw new Error(`Failed to load GLTF asset ${path}: ${response.status}`);
      }
      const text = await response.text();
      const budget = getBudget(definition);

      if (budget && text.length > budget.maxBytes) {
        throw new Error(`GLTF asset ${path} exceeds ${budget.maxBytes} bytes`);
      }

      const gltf = JSON.parse(text);
      const nodeCount = Array.isArray(gltf.nodes) ? gltf.nodes.length : 0;
      const primitiveCount =
        gltf.extras?.mps?.primitives?.length ??
        (Array.isArray(gltf.meshes)
          ? gltf.meshes.reduce(
              (total: number, mesh: { primitives?: unknown[] }) =>
                total + (Array.isArray(mesh.primitives) ? mesh.primitives.length : 0),
              0
            )
          : 0);

      if (budget && nodeCount > budget.maxNodes) {
        throw new Error(`GLTF asset ${path} exceeds ${budget.maxNodes} nodes`);
      }
      if (budget && primitiveCount > budget.maxPrimitives) {
        throw new Error(
          `GLTF asset ${path} exceeds ${budget.maxPrimitives} primitives`
        );
      }

      return {
        definition,
        gltf,
        byteLength: text.length,
        loadedAt: Date.now(),
      };
    })
    .catch((error) => {
      gltfCache.delete(path);
      throw error;
    });

  gltfCache.set(path, promise);
  return promise;
}

/**
 * Clear GLTF cache for tests and hot reload recovery.
 */
export function clearGltfAssetCache() {
  gltfCache.clear();
}
