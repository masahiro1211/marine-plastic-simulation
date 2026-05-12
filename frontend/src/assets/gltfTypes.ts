import type { AgentType } from "../types";

export type StageAssetType = "image" | "gltf";

export interface AssetBudget {
  maxBytes: number;
  maxNodes: number;
  maxPrimitives: number;
}

export interface AgentAssetDefinition {
  agentType: AgentType;
  gltfPath: string;
  animationClips: string[];
  budget: AssetBudget;
  fallbackRenderer: AgentType;
}

export interface StageAssetDefinition {
  id: string;
  type: StageAssetType;
  path: string;
  x: number;
  y: number;
  width: number;
  height: number;
  opacity?: number;
  parallax?: number;
  budget?: AssetBudget;
}

export interface AssetManifest {
  version: number;
  agents: Record<AgentType, AgentAssetDefinition>;
  stage: StageAssetDefinition[];
}

export type LightweightPrimitiveKind = "polygon" | "ellipse" | "rect";

export interface LightweightPrimitive {
  kind: LightweightPrimitiveKind;
  fill: string;
  stroke?: string;
  lineWidth?: number;
  points?: Array<[number, number]>;
  radiusX?: number;
  radiusY?: number;
  width?: number;
  height?: number;
  x?: number;
  y?: number;
}

export interface LightweightGltfExtras {
  mps?: {
    anchor?: [number, number];
    scale?: number;
    primitives?: LightweightPrimitive[];
    animationClips?: string[];
  };
}

export interface LightweightGltfAsset {
  asset?: {
    version?: string;
    generator?: string;
  };
  scene?: number;
  scenes?: unknown[];
  nodes?: unknown[];
  meshes?: unknown[];
  cameras?: unknown[];
  animations?: unknown[];
  extras?: LightweightGltfExtras;
}

export interface LoadedGltfAsset {
  definition: AgentAssetDefinition | StageAssetDefinition;
  gltf: LightweightGltfAsset;
  byteLength: number;
  loadedAt: number;
}
