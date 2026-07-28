import * as THREE from 'three';

import type {
  LdrLoaderInstance,
  LdrPartsBuilderFacade,
  LdrPartsBuilderInstance,
  LdrStepHandlerFacade,
  LdrStepHandlerInstance,
  LdrSubModelPlacement,
  LdrThreeVendor,
  LoadedLdrModel,
} from '../types';
import { createRemotePartResolver } from './idToUrl';
import {
  createLdrSceneManager,
  fitObjectToView,
} from '../steps/LdrSceneManager';
import {
  MemoryLdrStorage,
  createCachingStorageBackend,
  defaultFetchText,
  loadPartContent,
} from '../storage/LdrStorage';
import type { LdrDisplayMode, LdrLoaderOptions } from '../types';
import '../registerVendor';

function normalizeLdrModelId(id: string): string {
  return id.replace(/\\/g, '/').toLowerCase();
}

function resolveMainModelId(
  loader: LdrLoaderInstance,
  requestedMainModelId: string,
): string {
  const normalizedRequested = normalizeLdrModelId(requestedMainModelId);

  if (loader.mainModel && loader.getPartType(loader.mainModel)) {
    return loader.mainModel;
  }

  if (loader.getPartType(normalizedRequested)) {
    return normalizedRequested;
  }

  for (const id of Object.keys(loader.partTypes)) {
    if (
      normalizeLdrModelId(id) === normalizedRequested &&
      loader.getPartType(id)
    ) {
      return id;
    }
  }

  throw new Error(
    `Main model "${requestedMainModelId}" not found in MPD (normalized: "${normalizedRequested}")`,
  );
}

function createMainPartDesc(
  mainModelId: string,
  color = 16,
): LdrSubModelPlacement {
  return {
    ID: mainModelId,
    c: color,
    p: new THREE.Vector3(),
    r: new THREE.Matrix3().set(1, 0, 0, 0, -1, 0, 0, 0, -1),
  };
}

function wrapStepHandler(
  handler: LdrStepHandlerInstance,
  root: THREE.Group,
): LdrStepHandlerFacade {
  return {
    moveTo(index: number) {
      handler.moveTo(index + 1);
    },
    nextStep() {
      return handler.nextStep(false);
    },
    prevStep() {
      return handler.prevStep(false);
    },
    getCurrentStepIndex() {
      return Math.max(handler.getCurrentStepIndex() - 1, 0);
    },
    getTotalSteps() {
      return handler.totalNumberOfSteps;
    },
    getRoot() {
      return root;
    },
    refreshAppearance() {
      handler.updateMeshCollectors(undefined);
    },
    debugVisibilityReport() {
      if (typeof handler.debugVisibilityReport !== 'function') {
        return {
          collectors: 0,
          meshCount: 0,
          flagTrue: 0,
          flagFalse: 0,
          mismatchCount: 0,
          mismatches: [],
          error: 'debugVisibilityReport unavailable',
        };
      }
      return handler.debugVisibilityReport();
    },
    computeCameraPositionRotation(
      defaultMatrix,
      currentRotationMatrix,
      useAccumulatedBounds,
    ) {
      return handler.computeCameraPositionRotation(
        defaultMatrix,
        currentRotationMatrix,
        useAccumulatedBounds,
      );
    },
    getAccumulatedBounds() {
      return handler.getAccumulatedBounds();
    },
    getBounds() {
      return handler.getBounds();
    },
    isAtFirstStep() {
      return handler.isAtFirstStep();
    },
    isAtLastStep() {
      return handler.isAtLastStep();
    },
  };
}

function colorToHex(value: number): string {
  return `#${value.toString(16).padStart(6, '0')}`;
}

function wrapPartsBuilder(
  builder: LdrPartsBuilderInstance,
): LdrPartsBuilderFacade {
  const parts = builder.pcKeys.map(key => {
    const pc = builder.pcs[key];
    const colorInfo = LDR.Colors[pc.c as number];
    return {
      key: pc.key,
      partID: pc.ID,
      c: pc.c,
      amount: pc.amount,
      colorName: colorInfo?.name ?? `Color ${pc.c}`,
      colorHex: colorInfo ? colorToHex(colorInfo.value) : '#808080',
      edgeHex: colorInfo ? colorToHex(colorInfo.edge) : '#333333',
    };
  });

  return { parts };
}

export type LoadMpdOptions = LdrLoaderOptions & {
  mainModelColor?: number;
  /** 仅 preview 模式生效 */
  displayScale?: number;
  partsSource?: 'local' | 'remote' | 'local-then-remote';
  /**
   * instruction: 不缩放/居中 root，由 computeCameraPositionRotation + 相机 zoom 对齐每步
   * preview: 加载后 fitObjectToView，适合整模展示
   * @default 'instruction'
   */
  mode?: LdrDisplayMode;
};

export function loadMpdFromText(
  mpdText: string,
  mainModelId: string,
  options: LoadMpdOptions,
): Promise<LoadedLdrModel> {
  const {
    partsBaseUrl,
    partsSource = partsBaseUrl ? 'local-then-remote' : 'local',
    readLocalPart,
    // 16=Main_Colour 占位黄 #FFFF80；未指定时用白，避免整模发黄
    mainModelColor = 15,
    displayScale = 1,
    mode = 'instruction',
    onProgress,
    onWarning,
    onError,
    fetchText = defaultFetchText,
  } = options;

  const remoteResolver =
    partsBaseUrl != null ? createRemotePartResolver(partsBaseUrl) : null;
  const storage = new MemoryLdrStorage();
  const cacheBackend = createCachingStorageBackend(storage);

  const shouldReadLocal =
    partsSource === 'local' || partsSource === 'local-then-remote';
  const shouldFetchRemote =
    partsSource === 'remote' ||
    (partsSource === 'local-then-remote' && remoteResolver);

  return new Promise((resolve, reject) => {
    const LdrLoaderCtor = (globalThis.THREE as LdrThreeVendor).LDRLoader;
    let loader: LdrLoaderInstance;

    // 按当前 Options 注册 stud 生成器（高对比 / logo）
    const studs = (
      globalThis as typeof globalThis & {
        LDR?: {
          Studs?: {
            makeGenerators: (
              force: string,
              highContrast: boolean,
              logoType: number,
            ) => void;
          };
          Options?: { studHighContrast?: number; studLogo?: number };
        };
      }
    ).LDR;
    if (studs?.Studs?.makeGenerators) {
      studs.Studs.makeGenerators(
        '',
        studs.Options?.studHighContrast === 1,
        studs.Options?.studLogo ?? 0,
      );
    }

    const handleError = (issue: { message: string; subModel?: string }) => {
      onError?.(issue);
    };

    loader = new LdrLoaderCtor(
      () => {
        try {
          const resolvedMainModelId = resolveMainModelId(loader, mainModelId);
          const manager = createLdrSceneManager(loader);
          const handler = new LDR.StepHandler(
            manager,
            [createMainPartDesc(resolvedMainModelId, mainModelColor)],
            true,
          ) as unknown as LdrStepHandlerInstance;
          handler.nextStep(false);

          const partsBuilder = new LDR.PartsBuilder(
            loader,
            resolvedMainModelId,
            mainModelColor,
          ) as unknown as LdrPartsBuilderInstance;
          if (mode === 'preview') {
            fitObjectToView(manager.baseObject, 1.2 * displayScale);
          }
          resolve({
            loader,
            mainModelId: resolvedMainModelId,
            mainModelColor,
            stepHandler: wrapStepHandler(handler, manager.baseObject),
            partsBuilder: wrapPartsBuilder(partsBuilder),
            root: manager.baseObject,
            mode,
          });
        } catch (error) {
          reject(error);
        }
      },
      cacheBackend,
      {
        onProgress: (id: string, isTexture?: boolean) =>
          onProgress?.(id, isTexture),
        onWarning: handleError,
        onError: handleError,
        idToUrl: (id: string) => remoteResolver?.resolvePart(id) ?? [],
        idToTextureUrl: (id: string) =>
          remoteResolver?.resolveTexture(id) ?? `textures/${id.toLowerCase()}`,
      },
    );

    loader.load = function patchedLoad(id: string) {
      // Must match LDRLoader's lowercase IDs; Android asset paths are case-sensitive.
      const normalizedId = normalizeLdrModelId(id);

      if (loader.partTypes[normalizedId]) {
        if (loader.partTypes[normalizedId] !== true) {
          loader.reportProgress(normalizedId);
        }
        return;
      }

      loader.partTypes[normalizedId] = true;
      loader.unloadedFiles += 1;

      void (async () => {
        try {
          const loaded = await loadPartContent(loader, normalizedId, storage, {
            readLocalPart: shouldReadLocal ? readLocalPart : undefined,
            remoteUrls: shouldFetchRemote
              ? remoteResolver?.resolvePart(normalizedId)
              : undefined,
            fetchText,
          });

          if (!loaded) {
            handleError({
              message: `Unable to load ${normalizedId}`,
              subModel: normalizedId,
            });
          }
        } catch (error: unknown) {
          // Large Studio custom parts can throw while parsing; without this
          // finally path, unloadedFiles never hits 0 and the model stays blank.
          const detail =
            error instanceof Error ? error.message : String(error);
          handleError({
            message: `Failed while loading ${normalizedId}: ${detail}`,
            subModel: normalizedId,
          });
        } finally {
          loader.unloadedFiles -= 1;
          loader.reportProgress(normalizedId);
        }
      })();
    };

    try {
      loader.parse(mpdText, normalizeLdrModelId(mainModelId));
    } catch (error) {
      reject(error);
    }
  });
}

export async function loadMpdFromUrl(
  mpdUrl: string,
  mainModelId: string,
  options: LoadMpdOptions,
): Promise<LoadedLdrModel> {
  const mpdText = await (options.fetchText ?? defaultFetchText)(mpdUrl);
  return loadMpdFromText(mpdText, mainModelId, options);
}
