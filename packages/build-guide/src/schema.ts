export const BAKED_MANIFEST_VERSION = 1 as const;

export type BakedPart = {
  id: string;
  nameKey: string;
  color?: string;
};

export type BakedCamera = {
  position: [number, number, number];
  target: [number, number, number];
};

export type BakedStep = {
  id: string;
  index: number;
  titleKey: string;
  descriptionKey: string;
  glb: string;
  parts: BakedPart[];
  newPartIds: string[];
  /** Visual size multiplier applied at runtime (from bake source scale). */
  displayScale?: number;
  camera?: BakedCamera;
};

export type BakedManifest = {
  version: typeof BAKED_MANIFEST_VERSION;
  id: string;
  nameKey: string;
  steps: BakedStep[];
};

export type BakeSourcePart = {
  id: string;
  nameKey: string;
  color?: string;
};

export type BakeSourceStep = {
  id: string;
  titleKey: string;
  descriptionKey: string;
  glb: string;
  parts: BakeSourcePart[];
  newPartIds: string[];
  scale?: number;
  camera?: BakedCamera;
};

export type BakeSourceManifest = {
  id: string;
  nameKey: string;
  sourceModel: string;
  steps: BakeSourceStep[];
};
