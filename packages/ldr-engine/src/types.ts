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

export type LdrPliEntry = PartAndColor & {
  description?: string;
  annotation?: string;
  sourcePartID?: string;
};

export type LdrPliAnnotation = {
  partID: string;
  text: string;
};

export type LdrPliRule = {
  partID: string;
  replacementPartID?: string;
  orientation?: ReadonlyArray<number>;
  annotation?: string;
};

export type LdrPliBuildContext = {
  mainModelId: string;
  stepIndex: number;
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
  annotation?: string;
  replacement?: string;
  pli?: LdrPartType;
  isPart?: boolean;
  steps: LdrParsedStep[];
  generateThreePart?: (
    loader: LdrLoaderInstance,
    colorID: number,
    position: THREE.Vector3,
    rotation: THREE.Matrix3,
    cull: boolean,
    invertCCW: boolean,
    meshCollector: LdrMeshCollector,
    partDesc?: LdrParsedSubModel,
    taskList?: Array<() => void>,
  ) => void;
};

export type LdrParsedStep = {
  subModels: LdrParsedSubModel[];
  rotation?: LdrStepRotation;
  original?: LdrParsedStep;
  containsNonPartSubModels?: (loader: LdrLoaderInstance) => boolean;
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
/** instruction: 步骤说明书，保持 LDraw 原始坐标；preview: 静态预览，缩放居中 */
export type LdrDisplayMode = 'instruction' | 'preview';

export type LoadedLdrModel = {
  loader: LdrLoaderInstance;
  mainModelId: string;
  mainModelColor: number;
  stepHandler: LdrStepHandlerFacade;
  partsBuilder: LdrPartsBuilderFacade;
  root: THREE.Group;
  mode: LdrDisplayMode;
};

export type LdrVisibilityDebugReport = {
  collectors: number;
  meshCount: number;
  flagTrue: number;
  flagFalse: number;
  mismatchCount: number;
  mismatches: Array<{
    path: string;
    collectorVisible: boolean;
    meshVisible: boolean;
    type: string;
    uuid: string;
  }>;
  error?: string;
};

export type LdrStepHandlerFacade = {
  moveTo: (index: number) => void;
  nextStep: () => boolean;
  prevStep: () => boolean;
  getCurrentStepIndex: () => number;
  getTotalSteps: () => number;
  getRoot: () => THREE.Group;
  /** 按当前 LDR.Options 重刷 old/边线外观（不切步） */
  refreshAppearance: () => void;
  /** 诊断用：collector.visible 与 mesh.visible 脱节报告 */
  debugVisibilityReport?: () => LdrVisibilityDebugReport;
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

export type LdrMeasuringLinePoint = {
  x: number;
  y: number;
};

export type LdrMeasuringLine = {
  a: number;
  y0: number;
  eval: (x: number) => number;
  toString: () => string;
  setOrigoTo: (x: number, y: number) => LdrMeasuringLine;
  scaleY: (scale: number) => LdrMeasuringLine;
  clone: () => LdrMeasuringLine;
};

export type LdrMeasurerInstance = {
  camera: THREE.Camera;
  m: THREE.Matrix4;
  measure: (b: THREE.Box3, matrixWorld: THREE.Matrix4) => [number, number];
  measureConvexHull: (
    b: THREE.Box3,
    matrixWorld: THREE.Matrix4,
  ) => [number, number, LdrMeasuringLine[], LdrMeasuringLine[]];
};

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
    loader?: LdrLoaderInstance,
  ) => LdrMeshCollector;
  Measurer: new (camera: THREE.Camera) => LdrMeasurerInstance;
  MeasuringLine: new (
    p1?: LdrMeasuringLinePoint,
    p2?: LdrMeasuringLinePoint,
  ) => LdrMeasuringLine;
  getScreenSize: () => [number, number];
  equals: (a: number, b: number) => boolean;
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
  getCurrentStep: () => LdrParsedStep | undefined;
  computeCameraPositionRotation: LdrStepHandlerFacade['computeCameraPositionRotation'];
  getAccumulatedBounds: () => THREE.Box3;
  getBounds: () => THREE.Box3;
  isAtFirstStep: () => boolean;
  isAtLastStep: () => boolean;
  cleanUpAfterWalking: () => void;
  updateMeshCollectors: (old?: boolean) => void;
  debugVisibilityReport?: () => LdrVisibilityDebugReport;
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
