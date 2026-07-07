import type * as THREE from 'three';

export type LdrColorInfo = {
  name: string;
  value: number;
  edge: number;
  alpha?: number;
  luminance?: number;
  direct?: string;
  lego_name?: string;
  lego_id?: number;
};

export type PartAndColor = {
  key: string;
  partID: string;
  c: number;
  amount: number;
  colorName: string;
  colorHex: string;
  edgeHex: string;
};

export type LdrLoaderOptions = {
  partsBaseUrl?: string;
  readLocalPart?: (id: string) => Promise<string | null>;
  onProgress?: (id: string, isTexture?: boolean) => void;
  onWarning?: (error: LdrLoadIssue) => void;
  onError?: (error: LdrLoadIssue) => void;
  fetchText?: (url: string) => Promise<string>;
};

export type LdrLoadIssue = {
  message: string;
  line?: number;
  subModel?: string;
};

export type LdrSubModelPlacement = {
  ID: string;
  c: number;
  p: THREE.Vector3;
  r: THREE.Matrix3;
};

export type LdrPartType = {
  ID: string;
  name?: string;
  modelDescription?: string;
  steps: LdrParsedStep[];
};

export type LdrParsedStep = {
  subModels: LdrParsedSubModel[];
  rotation?: LdrStepRotation;
  original?: LdrParsedStep;
};

export type LdrParsedSubModel = {
  ID: string;
  c: number;
  REPLACEMENT_PLI?: string | boolean;
};

export type LdrStepRotation = {
  getRotationMatrix: (defaultMatrix: THREE.Matrix4) => THREE.Matrix4;
};

export type LdrMeshCollector = {
  boundingBox: THREE.Box3;
  draw: (old?: boolean) => void;
  setVisible: (visible: boolean) => void;
};

export type LdrLoaderInstance = {
  partTypes: Record<string, unknown>;
  mainModel?: string;
  load: (id: string) => void;
  loadMultiple: (ids: string[]) => void;
  parse: (data: string, defaultID: string) => void;
  getPartType: (id: string) => LdrPartType | undefined;
  setPartType: (part: LdrPartType) => void;
  reportProgress: (id: string) => void;
  substituteReplacementParts: () => void;
  unloadedFiles: number;
};

export type LoadedLdrModel = {
  loader: LdrLoaderInstance;
  mainModelId: string;
  stepHandler: LdrStepHandlerFacade;
  partsBuilder: LdrPartsBuilderFacade;
  root: THREE.Group;
};

export type LdrStepHandlerFacade = {
  moveTo: (index: number) => void;
  nextStep: () => boolean;
  prevStep: () => boolean;
  getCurrentStepIndex: () => number;
  getTotalSteps: () => number;
  getRoot: () => THREE.Group;
  computeCameraPositionRotation: (
    defaultMatrix: THREE.Matrix4,
    currentRotationMatrix: THREE.Matrix4,
    useAccumulatedBounds?: boolean,
  ) => [THREE.Vector3, THREE.Matrix4];
  getAccumulatedBounds: () => THREE.Box3;
  getBounds: () => THREE.Box3;
  isAtFirstStep: () => boolean;
  isAtLastStep: () => boolean;
};

export type LdrPartsBuilderFacade = {
  parts: ReadonlyArray<PartAndColor>;
};

export interface LdrStorage {
  get: (id: string) => Promise<string | null>;
  set: (id: string, text: string) => Promise<void>;
}

export type LdrStorageBackend = {
  retrievePartsFromStorage: (
    loader: LdrLoaderInstance,
    ids: string[],
    onDone: (remaining: string[]) => void,
  ) => void;
};

declare global {
  // eslint-disable-next-line no-var
  var LDR: LdrGlobalNamespace;
}

export type LdrGlobalNamespace = {
  Colors: Record<number, LdrColorInfo> & LdrColorInfo[];
  Generator?: {
    make: (id: string) => LdrPartType | null;
    bx: (w: number, h: number) => LdrPartType;
  };
  StepHandler: new (
    manager: LdrSceneManager,
    partDescs: LdrSubModelPlacement[],
    isForMainModel: boolean,
  ) => LdrStepHandlerInstance;
  PartsBuilder: new (
    loader: LdrLoaderInstance,
    mainModelID: string,
    mainModelColor: number,
    onBuiltPart?: () => void,
  ) => LdrPartsBuilderInstance;
  PartAndColor: new (
    key: string,
    part: LdrParsedSubModel,
    c: number,
    loader: LdrLoaderInstance,
  ) => LdrPartAndColorInstance;
  MeshCollector: new (
    opaqueObject: THREE.Group,
    sixteenObject: THREE.Group,
    transObject: THREE.Group,
    manager?: LdrSceneManager,
  ) => LdrMeshCollector;
  EPS: number;
  tmpSize?: THREE.Vector3;
};

export type LdrStepHandlerInstance = {
  current: number;
  length: number;
  totalNumberOfSteps: number;
  moveTo: (to: number) => void;
  nextStep: (skipDrawing?: boolean) => boolean;
  prevStep: (skipDrawing?: boolean) => boolean;
  getCurrentStepIndex: () => number;
  computeCameraPositionRotation: LdrStepHandlerFacade['computeCameraPositionRotation'];
  getAccumulatedBounds: () => THREE.Box3;
  getBounds: () => THREE.Box3;
  isAtFirstStep: () => boolean;
  isAtLastStep: () => boolean;
  cleanUpAfterWalking: () => void;
};

export type LdrPartsBuilderInstance = {
  pcs: Record<string, LdrPartAndColorInstance>;
  pcKeys: string[];
};

export type LdrPartAndColorInstance = {
  key: string;
  ID: string;
  c: number;
  amount: number;
  partType: LdrPartType;
};

export type LdrSceneManager = {
  opaqueObject: THREE.Group;
  sixteenObject: THREE.Group;
  transObject: THREE.Group;
  baseObject: THREE.Group;
  ldrLoader: LdrLoaderInstance;
  resetSelectedObjects: () => void;
};

export type LdrThreeVendor = typeof import('three') & {
  LDRLoader: new (
    onLoad: () => void,
    storage: LdrStorageBackend | null,
    options?: Record<string, unknown>,
  ) => LdrLoaderInstance;
};
