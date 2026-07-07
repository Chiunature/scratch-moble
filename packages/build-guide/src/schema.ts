export const MPD_MANIFEST_VERSION = 1 as const;

export type MpdCamera = {
  position: [number, number, number];
  target: [number, number, number];
};

export type RuntimeStepOverride = {
  index: number;
  titleKey?: string;
  descriptionKey?: string;
  displayScale?: number;
  camera?: MpdCamera;
};

export type MpdManifest = {
  version: typeof MPD_MANIFEST_VERSION;
  id: string;
  nameKey: string;
  mpdUri: string;
  mainModelId: string;
  partsSource?: 'local' | 'remote' | 'local-then-remote';
  partsBaseUrl?: string;
  mainModelColor?: number;
  displayScale?: number;
  cameraDefault?: MpdCamera;
  steps?: RuntimeStepOverride[];
};
