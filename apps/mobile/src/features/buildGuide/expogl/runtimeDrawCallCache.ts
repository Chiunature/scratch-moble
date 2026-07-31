import type { LdrDisplayMode } from '@scratch-mobile/ldr-engine';

import type { BuildGuideBundle } from '../types';
import {
  createRuntimeDrawCallUploadCache,
  disposeRuntimeDrawCallUploadCache,
  pruneRuntimeDrawCallUploadCache,
  type RuntimeDrawCallUploadCache,
} from './glFrameRenderer';
import type { ExpoGlRuntimeContext, RuntimeDrawCall } from './glTypes';
import {
  createSceneDrawCallCache,
  type SceneDrawCallCache,
} from './sceneDrawCalls';

type MutableRef<T> = { current: T };

export type RuntimeDrawCallCache = {
  gl: ExpoGlRuntimeContext;
  stepHandler: NonNullable<BuildGuideBundle['stepHandler']>;
  mode: LdrDisplayMode;
  appearanceRevision: number;
  sceneDrawCallCache: SceneDrawCallCache;
  uploadCache: RuntimeDrawCallUploadCache;
  drawCallsByStep: Map<number, RuntimeDrawCall[]>;
};

const DRAW_CALL_CACHE_RADIUS = 5;

export function isSameRuntimeDrawCallCache(
  cache: RuntimeDrawCallCache,
  gl: ExpoGlRuntimeContext,
  stepHandler: NonNullable<BuildGuideBundle['stepHandler']>,
  mode: LdrDisplayMode,
  appearanceRevision: number,
): boolean {
  return (
    cache.gl === gl &&
    cache.stepHandler === stepHandler &&
    cache.mode === mode &&
    cache.appearanceRevision === appearanceRevision
  );
}

export function resolveRuntimeDrawCallCache(
  cacheRef: MutableRef<RuntimeDrawCallCache | null>,
  gl: ExpoGlRuntimeContext,
  stepHandler: NonNullable<BuildGuideBundle['stepHandler']>,
  mode: LdrDisplayMode,
  appearanceRevision: number,
): RuntimeDrawCallCache {
  const cache = cacheRef.current;
  if (cache) {
    if (
      isSameRuntimeDrawCallCache(
        cache,
        gl,
        stepHandler,
        mode,
        appearanceRevision,
      )
    ) {
      return cache;
    }

    if (cache.gl === gl) {
      disposeRuntimeDrawCallUploadCache(cache.uploadCache);
    }
    cacheRef.current = null;
  }

  const nextCache = {
    gl,
    stepHandler,
    mode,
    appearanceRevision,
    sceneDrawCallCache: createSceneDrawCallCache(),
    uploadCache: createRuntimeDrawCallUploadCache(gl),
    drawCallsByStep: new Map<number, RuntimeDrawCall[]>(),
  };
  cacheRef.current = nextCache;
  return nextCache;
}

function pruneRuntimeDrawCallCache(
  cache: RuntimeDrawCallCache,
  stepIndex: number,
  totalSteps: number,
): void {
  const keep = new Set(
    Array.from(
      { length: DRAW_CALL_CACHE_RADIUS * 2 + 1 },
      (_, offset) => stepIndex - DRAW_CALL_CACHE_RADIUS + offset,
    ).filter(index => index >= 0 && index < totalSteps),
  );

  for (const cachedStep of cache.drawCallsByStep.keys()) {
    if (!keep.has(cachedStep)) {
      cache.drawCallsByStep.delete(cachedStep);
    }
  }
}

function retainCachedRuntimeDrawCallPositions(
  cache: RuntimeDrawCallCache,
): ReadonlySet<Float32Array> {
  const retained = new Set<Float32Array>();
  for (const drawCalls of cache.drawCallsByStep.values()) {
    for (const drawCall of drawCalls) {
      retained.add(drawCall.positions);
    }
  }
  return retained;
}

export function pruneRuntimeCaches(
  cache: RuntimeDrawCallCache,
  stepIndex: number,
  totalSteps: number,
): void {
  pruneRuntimeDrawCallCache(cache, stepIndex, totalSteps);
  pruneRuntimeDrawCallUploadCache(
    cache.uploadCache,
    retainCachedRuntimeDrawCallPositions(cache),
  );
}

export function releaseRuntimeDrawCallCacheRef(
  cacheRef: MutableRef<RuntimeDrawCallCache | null>,
  activeGl: ExpoGlRuntimeContext | null,
): void {
  const cache = cacheRef.current;
  if (!cache) {
    return;
  }

  if (cache.gl === activeGl) {
    disposeRuntimeDrawCallUploadCache(cache.uploadCache);
  }
  cacheRef.current = null;
}