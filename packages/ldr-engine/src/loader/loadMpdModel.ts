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
import type { LdrLoaderOptions } from '../types';
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
  displayScale?: number;
  partsSource?: 'local' | 'remote' | 'local-then-remote';
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
    mainModelColor = 16,
    displayScale = 1,
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
          fitObjectToView(manager.baseObject, 1.2 * displayScale);

          resolve({
            loader,
            mainModelId: resolvedMainModelId,
            stepHandler: wrapStepHandler(handler, manager.baseObject),
            partsBuilder: wrapPartsBuilder(partsBuilder),
            root: manager.baseObject,
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
      const normalizedId = id.replace(/\\/g, '/');

      if (loader.partTypes[normalizedId]) {
        if (loader.partTypes[normalizedId] !== true) {
          loader.reportProgress(normalizedId);
        }
        return;
      }

      loader.partTypes[normalizedId] = true;
      loader.unloadedFiles += 1;

      void (async () => {
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

        loader.unloadedFiles -= 1;
        loader.reportProgress(normalizedId);
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
