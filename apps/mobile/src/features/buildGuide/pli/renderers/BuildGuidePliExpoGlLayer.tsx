import React, { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { GLView, type ExpoWebGLRenderingContext } from 'expo-gl';

import type { LoadedLdrModel } from '@scratch-mobile/ldr-engine';

import {
  disposeUploadedFrame,
  resolveRenderSize,
  uploadRuntimeDrawCalls,
} from '../../expogl/glFrameRenderer';
import { createProgram, disposeProgram } from '../../expogl/glProgram';
import type {
  CanvasLayoutSize,
  ExpoGlRuntimeContext,
  RawGlProgram,
  RuntimeDrawCall,
  UploadedFrame,
} from '../../expogl/glTypes';
import { collectRuntimeDrawCalls } from '../../expogl/sceneDrawCalls';
import {
  drawPliThumbnailFrame,
  type PliUploadedThumbnail,
} from './drawPliThumbnailFrame';
import { createPliThumbnailScene } from './thumbnailScene';
import type { PliThumbnailRequest } from './types';

type MutableRef<T> = { current: T };

type PliThumbnailGeometryCacheEntry = {
  cacheKey: string;
  drawCalls: RuntimeDrawCall[];
  camera: PliUploadedThumbnail['camera'];
  lastUsed: number;
};

type PliThumbnailGeometryCache = {
  entries: Map<string, PliThumbnailGeometryCacheEntry>;
  useSeq: number;
};

type PliThumbnailCacheEntry = {
  cacheKey: string;
  frame: UploadedFrame;
  camera: PliUploadedThumbnail['camera'];
  lastUsed: number;
};

type PliThumbnailUploadCache = {
  gl: ExpoGlRuntimeContext;
  model: LoadedLdrModel;
  entries: Map<string, PliThumbnailCacheEntry>;
  useSeq: number;
};

type BuildGuidePliExpoGlLayerProps = {
  model: LoadedLdrModel | null;
  thumbnails: ReadonlyArray<PliThumbnailRequest>;
  layoutSize: CanvasLayoutSize;
  onUnavailable?: () => void;
  /** 首帧缩略图绘制完成（切步 loading 用） */
  onReady?: () => void;
};

const MAX_PLI_THUMBNAIL_CACHE_ENTRIES = 80;
const MAX_PLI_THUMBNAIL_GEOMETRY_CACHE_ENTRIES = 160;
const thumbnailGeometryCaches = new WeakMap<
  LoadedLdrModel,
  PliThumbnailGeometryCache
>();
const ASPECT_KEY_PRECISION = 1000;
/** 步进防抖：连点时只为停住的那一步建缩略图。 */
const PLI_THUMBNAIL_BUILD_DEFER_MS = 450;
/** 每帧最多新建 1 个；单个 createThumbnailScene 可能很重。 */
const PLI_THUMBNAILS_PER_CHUNK = 1;

function normalizePartID(partID: string): string {
  return partID.replace(/\\/g, '/').toLowerCase();
}

function resolveAspectKey(viewport: PliThumbnailRequest['viewport']): string {
  const aspect =
    viewport.width > 0 && viewport.height > 0
      ? viewport.width / viewport.height
      : 1;
  return String(Math.round(aspect * ASPECT_KEY_PRECISION));
}

function createThumbnailCacheKey(request: PliThumbnailRequest): string {
  return [
    normalizePartID(request.partID),
    request.colorID,
    resolveAspectKey(request.viewport),
  ].join(':');
}

function disposeThumbnailCache(cache: PliThumbnailUploadCache | null): void {
  if (!cache) {
    return;
  }

  for (const entry of cache.entries.values()) {
    disposeUploadedFrame(cache.gl, entry.frame);
  }
  cache.entries.clear();
}

function resetThumbnailCache(
  cacheRef: MutableRef<PliThumbnailUploadCache | null>,
): void {
  disposeThumbnailCache(cacheRef.current);
  cacheRef.current = null;
}

function resolveThumbnailCache(
  cacheRef: MutableRef<PliThumbnailUploadCache | null>,
  gl: ExpoGlRuntimeContext,
  model: LoadedLdrModel,
): PliThumbnailUploadCache {
  const cache = cacheRef.current;
  if (cache && cache.gl === gl && cache.model === model) {
    return cache;
  }

  resetThumbnailCache(cacheRef);
  const nextCache: PliThumbnailUploadCache = {
    gl,
    model,
    entries: new Map<string, PliThumbnailCacheEntry>(),
    useSeq: 0,
  };
  cacheRef.current = nextCache;
  return nextCache;
}

function pruneThumbnailCache(
  cache: PliThumbnailUploadCache,
  maxEntries: number,
): void {
  const overflow = cache.entries.size - maxEntries;
  if (overflow <= 0) {
    return;
  }

  const staleEntries = [...cache.entries.values()]
    .sort((a, b) => a.lastUsed - b.lastUsed)
    .slice(0, overflow);

  for (const entry of staleEntries) {
    if (cache.entries.get(entry.cacheKey) !== entry) {
      continue;
    }

    disposeUploadedFrame(cache.gl, entry.frame);
    cache.entries.delete(entry.cacheKey);
  }
}

function resolveThumbnailGeometryCache(
  model: LoadedLdrModel,
): PliThumbnailGeometryCache {
  const cache = thumbnailGeometryCaches.get(model);
  if (cache) {
    return cache;
  }

  const nextCache: PliThumbnailGeometryCache = {
    entries: new Map<string, PliThumbnailGeometryCacheEntry>(),
    useSeq: 0,
  };
  thumbnailGeometryCaches.set(model, nextCache);
  return nextCache;
}

function pruneThumbnailGeometryCache(
  cache: PliThumbnailGeometryCache,
  maxEntries: number,
): void {
  const overflow = cache.entries.size - maxEntries;
  if (overflow <= 0) {
    return;
  }

  const staleEntries = [...cache.entries.values()]
    .sort((a, b) => a.lastUsed - b.lastUsed)
    .slice(0, overflow);

  for (const entry of staleEntries) {
    if (cache.entries.get(entry.cacheKey) !== entry) {
      continue;
    }

    cache.entries.delete(entry.cacheKey);
  }
}

function createThumbnailGeometryCacheEntry(
  model: LoadedLdrModel,
  request: PliThumbnailRequest,
  cacheKey: string,
  lastUsed: number,
): PliThumbnailGeometryCacheEntry | null {
  const scene = createPliThumbnailScene(model, request);
  if (!scene) {
    return null;
  }

  const drawCalls = collectRuntimeDrawCalls(scene.root);
  if (drawCalls.length === 0) {
    return null;
  }

  return {
    cacheKey,
    drawCalls,
    camera: scene.camera,
    lastUsed,
  };
}

function resolveCachedThumbnailGeometry(
  model: LoadedLdrModel,
  request: PliThumbnailRequest,
  cacheKey: string,
): PliThumbnailGeometryCacheEntry | null {
  const cache = resolveThumbnailGeometryCache(model);
  const nextUseSeq = cache.useSeq + 1;
  cache.useSeq = nextUseSeq;

  const cached = cache.entries.get(cacheKey);
  if (cached) {
    cached.lastUsed = nextUseSeq;
    return cached;
  }

  const created = createThumbnailGeometryCacheEntry(
    model,
    request,
    cacheKey,
    nextUseSeq,
  );
  if (!created) {
    return null;
  }

  cache.entries.set(cacheKey, created);
  pruneThumbnailGeometryCache(
    cache,
    MAX_PLI_THUMBNAIL_GEOMETRY_CACHE_ENTRIES,
  );
  return created;
}

function createThumbnailCacheEntry(
  gl: ExpoGlRuntimeContext,
  model: LoadedLdrModel,
  request: PliThumbnailRequest,
  cacheKey: string,
  lastUsed: number,
): PliThumbnailCacheEntry | null {
  const geometry = resolveCachedThumbnailGeometry(model, request, cacheKey);
  if (!geometry) {
    return null;
  }

  const frame = uploadRuntimeDrawCalls(gl, geometry.drawCalls);

  return {
    cacheKey,
    frame,
    camera: geometry.camera,
    lastUsed,
  };
}

function createUploadedThumbnail(
  request: PliThumbnailRequest,
  entry: PliThumbnailCacheEntry,
): PliUploadedThumbnail {
  return {
    key: request.key,
    viewport: request.viewport,
    camera: entry.camera,
    frame: entry.frame,
  };
}

function resolveCachedUploadedThumbnail(
  gl: ExpoGlRuntimeContext,
  model: LoadedLdrModel,
  cache: PliThumbnailUploadCache,
  request: PliThumbnailRequest,
): PliUploadedThumbnail | null {
  const cacheKey = createThumbnailCacheKey(request);
  const nextUseSeq = cache.useSeq + 1;
  cache.useSeq = nextUseSeq;

  const cached = cache.entries.get(cacheKey);
  if (cached) {
    cached.lastUsed = nextUseSeq;
    return createUploadedThumbnail(request, cached);
  }

  try {
    const created = createThumbnailCacheEntry(
      gl,
      model,
      request,
      cacheKey,
      nextUseSeq,
    );
    if (!created) {
      return null;
    }

    cache.entries.set(cacheKey, created);
    return createUploadedThumbnail(request, created);
  } catch {
    return null;
  }
}

function buildUploadedThumbnails(
  gl: ExpoGlRuntimeContext,
  model: LoadedLdrModel,
  cache: PliThumbnailUploadCache,
  requests: ReadonlyArray<PliThumbnailRequest>,
): PliUploadedThumbnail[] {
  return requests.reduce<PliUploadedThumbnail[]>((uploaded, request) => {
    const thumbnail = resolveCachedUploadedThumbnail(gl, model, cache, request);
    if (thumbnail) {
      uploaded.push(thumbnail);
    }
    return uploaded;
  }, []);
}

export function BuildGuidePliExpoGlLayer({
  model,
  thumbnails,
  layoutSize,
  onUnavailable,
  onReady,
}: BuildGuidePliExpoGlLayerProps) {
  const glRef = useRef<ExpoGlRuntimeContext | null>(null);
  const programRef = useRef<RawGlProgram | null>(null);
  const cacheRef = useRef<PliThumbnailUploadCache | null>(null);
  const onUnavailableRef = useRef(onUnavailable);
  const onReadyRef = useRef(onReady);
  const [contextReady, setContextReady] = useState(false);
  const [disabled, setDisabled] = useState(false);
  const { height: layoutHeight, width: layoutWidth } = layoutSize;
  // expo-gl 在父级尺寸变化时往往不重建 framebuffer，导致视口映射错位；用 key 强制重建
  const canvasKey = `${Math.round(layoutWidth)}x${Math.round(layoutHeight)}`;

  onUnavailableRef.current = onUnavailable;
  onReadyRef.current = onReady;

  const releaseRuntime = useCallback(() => {
    resetThumbnailCache(cacheRef);
    const gl = glRef.current;
    if (gl) {
      disposeProgram(gl, programRef.current);
    }

    programRef.current = null;
    glRef.current = null;
  }, []);

  const dropRuntimeRefs = useCallback(() => {
    cacheRef.current = null;
    programRef.current = null;
    glRef.current = null;
  }, []);

  const disableLayer = useCallback(() => {
    releaseRuntime();
    setContextReady(false);
    setDisabled(true);
    onUnavailableRef.current?.();
  }, [releaseRuntime]);

  useEffect(() => {
    setContextReady(false);
    dropRuntimeRefs();
  }, [canvasKey, dropRuntimeRefs]);

  const handleContextCreate = useCallback(
    (context: ExpoWebGLRenderingContext) => {
      if (disabled) {
        return;
      }

      try {
        dropRuntimeRefs();
        const gl = context as ExpoGlRuntimeContext;
        const program = createProgram(gl);
        glRef.current = gl;
        programRef.current = program;
        setContextReady(true);
      } catch {
        disableLayer();
      }
    },
    [disabled, disableLayer, dropRuntimeRefs],
  );

  useEffect(() => {
    if (!contextReady || disabled) {
      return;
    }

    const gl = glRef.current;
    const program = programRef.current;
    if (!gl || !program) {
      return;
    }

    let cancelled = false;
    let deferTimer: ReturnType<typeof setTimeout> | null = null;
    let chunkRaf = 0;

    const finishWithThumbnails = (
      uploadedThumbnails: PliUploadedThumbnail[],
      renderLayoutSize: CanvasLayoutSize,
      renderSize: ReturnType<typeof resolveRenderSize>,
      cache: PliThumbnailUploadCache | null,
    ) => {
      if (cancelled) {
        return;
      }

      if (cache) {
        pruneThumbnailCache(cache, MAX_PLI_THUMBNAIL_CACHE_ENTRIES);
      }

      drawPliThumbnailFrame(
        gl,
        program,
        uploadedThumbnails,
        renderLayoutSize,
        renderSize,
      );

      if (model && thumbnails.length > 0 && uploadedThumbnails.length === 0) {
        onUnavailableRef.current?.();
        return;
      }

      onReadyRef.current?.();
    };

    const startBuild = () => {
      if (cancelled) {
        return;
      }

      try {
        const renderLayoutSize: CanvasLayoutSize = {
          height: layoutHeight,
          width: layoutWidth,
        };
        const renderSize = resolveRenderSize(gl, renderLayoutSize);
        // drawingBuffer 与布局比例不一致时跳过本帧，等 GLView 按 key 重建后再画
        const layoutAspect = layoutWidth / layoutHeight;
        const bufferAspect = renderSize.width / renderSize.height;
        if (Math.abs(layoutAspect - bufferAspect) > 0.05) {
          return;
        }

        const cache = model ? resolveThumbnailCache(cacheRef, gl, model) : null;
        if (!cache) {
          resetThumbnailCache(cacheRef);
          finishWithThumbnails([], renderLayoutSize, renderSize, null);
          return;
        }

        if (!model || thumbnails.length === 0) {
          finishWithThumbnails([], renderLayoutSize, renderSize, cache);
          return;
        }

        // 全命中缓存时一次做完，避免无意义分帧延迟。
        const allCached = thumbnails.every(request =>
          cache.entries.has(createThumbnailCacheKey(request)),
        );
        if (allCached) {
          finishWithThumbnails(
            buildUploadedThumbnails(gl, model, cache, thumbnails),
            renderLayoutSize,
            renderSize,
            cache,
          );
          return;
        }

        const uploadedThumbnails: PliUploadedThumbnail[] = [];
        let index = 0;

        const pumpChunk = () => {
          if (cancelled) {
            return;
          }

          const end = Math.min(
            index + PLI_THUMBNAILS_PER_CHUNK,
            thumbnails.length,
          );
          for (; index < end; index += 1) {
            const thumbnail = resolveCachedUploadedThumbnail(
              gl,
              model,
              cache,
              thumbnails[index],
            );
            if (thumbnail) {
              uploadedThumbnails.push(thumbnail);
            }
          }

          if (index < thumbnails.length) {
            chunkRaf = requestAnimationFrame(() => {
              chunkRaf = requestAnimationFrame(pumpChunk);
            });
            return;
          }

          finishWithThumbnails(
            uploadedThumbnails,
            renderLayoutSize,
            renderSize,
            cache,
          );
        };

        pumpChunk();
      } catch {
        if (!cancelled) {
          disableLayer();
        }
      }
    };

    const uploadedCache = cacheRef.current;
    const canDrawFromUploadCache =
      model != null &&
      uploadedCache != null &&
      uploadedCache.gl === gl &&
      uploadedCache.model === model &&
      thumbnails.length > 0 &&
      thumbnails.every(request =>
        uploadedCache.entries.has(createThumbnailCacheKey(request)),
      );

    if (!model || thumbnails.length === 0 || canDrawFromUploadCache) {
      chunkRaf = requestAnimationFrame(startBuild);
    } else {
      deferTimer = setTimeout(() => {
        chunkRaf = requestAnimationFrame(startBuild);
      }, PLI_THUMBNAIL_BUILD_DEFER_MS);
    }

    return () => {
      cancelled = true;
      if (deferTimer) {
        clearTimeout(deferTimer);
      }
      cancelAnimationFrame(chunkRaf);
    };
  }, [
    contextReady,
    disabled,
    disableLayer,
    layoutHeight,
    layoutWidth,
    model,
    thumbnails,
  ]);

  useEffect(
    () => () => {
      releaseRuntime();
    },
    [releaseRuntime],
  );

  if (
    disabled ||
    layoutWidth <= 0 ||
    layoutHeight <= 0 ||
    thumbnails.length === 0
  ) {
    return null;
  }

  return (
    <View
      pointerEvents="none"
      style={[
        styles.layer,
        {
          height: layoutHeight,
          width: layoutWidth,
        },
      ]}
    >
      <GLView
        key={canvasKey}
        style={styles.canvas}
        msaaSamples={4}
        onContextCreate={handleContextCreate}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  canvas: {
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  layer: {
    left: 0,
    position: 'absolute',
    top: 0,
  },
});
