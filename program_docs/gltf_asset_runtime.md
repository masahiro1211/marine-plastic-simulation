# GLTF Asset Runtime

## 1. Runtime Overview

GLTF assets are resolved through `ASSET_MANIFEST` and loaded by `loadGltfAsset`. The loader fetches GLTF JSON from `public/assets/gltf`, validates the configured lightweight budget, and caches successful loads by path.

The Canvas renderer uses GLTF assets first. If an asset is not loaded yet or fails to load, the previous per-agent Canvas renderer remains the fallback path.

## 2. Agent Assets

Each agent entry defines:

- `agentType`: backend `AgentState.agent_type` value.
- `gltfPath`: public GLTF path.
- `animationClips`: clips expected by the runtime.
- `budget`: maximum byte, node, and primitive counts.
- `fallbackRenderer`: legacy renderer key used while GLTF is unavailable.

Current dummy assets:

- `scout`: `idle`, `scan`, `move`
- `collector`: `idle`, `move`, `carry`
- `marine_life`: `idle`, `swim`, `stress`
- `trash`: `idle`, `drift`

## 3. Stage Assets

Stage entries support `image` and `gltf`.

- `ocean-background` is an SVG image layer.
- `base-platform` is a dummy GLTF layer.

The stage is still rendered on Canvas. This keeps the current dashboard lightweight while allowing stage elements to move from image to GLTF incrementally.

## 4. Dummy GLTF Convention

Dummy files are GLTF 2.0 JSON and carry renderer-specific test data in `extras.mps`.

```json
{
  "extras": {
    "mps": {
      "animationClips": ["idle"],
      "primitives": []
    }
  }
}
```

`animations` also includes clip names so validation can confirm that the file advertises animation support at the GLTF level.

## 5. Camera Controls

The Canvas owns a simple camera state:

- Mouse drag: pan.
- Mouse wheel: zoom.
- Arrow keys: pan when Canvas has focus.
- `+` / `-`: zoom when Canvas has focus.
- `0`: reset camera.

The camera transform is applied before stage and agent drawing, so all GLTF and image assets share the same world coordinate system.

## 6. Validation

Run:

```bash
cd frontend
npm run test:gltf-assets
npm run typecheck
BUILD_PATH=/tmp/mps-frontend-build npm run build
```

The repository currently contains an old `frontend/build` directory owned by `nobody`, so writing the default build output path may fail. Use `BUILD_PATH` or fix that directory ownership outside the application code.
