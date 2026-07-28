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
};

const MAX_PLI_THUMBNAIL_CACHE_ENTRIES = 80;
const ASPECT_KEY_PRECISION = 1000;

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

function createThumbnailCacheEntry(
  gl: ExpoGlRuntimeContext,
  model: LoadedLdrModel,
  request: PliThumbnailRequest,
  cacheKey: string,
  lastUsed: number,
): PliThumbnailCacheEntry | null {
  const scene = createPliThumbnailScene(model, request);
  if (!scene) {
    return null;
  }

  const drawCalls = collectRuntimeDrawCalls(scene.root);
  if (drawCalls.length === 0) {
    return null;
  }

  const frame = uploadRuntimeDrawCalls(gl, drawCalls);

  return {
    cacheKey,
    frame,
    camera: scene.camera,
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
}: BuildGuidePliExpoGlLayerProps) {
  const glRef = useRef<ExpoGlRuntimeContext | null>(null);
  const programRef = useRef<RawGlProgram | null>(null);
  const cacheRef = useRef<PliThumbnailUploadCache | null>(null);
  const [contextReady, setContextReady] = useState(false);
  const [disabled, setDisabled] = useState(false);
  const { height: layoutHeight, width: layoutWidth } = layoutSize;

  const releaseRuntime = useCallback(() => {
    resetThumbnailCache(cacheRef);
    const gl = glRef.current;
    if (gl) {
      disposeProgram(gl, programRef.current);
    }

    programRef.current = null;
    glRef.current = null;
  }, []);

  const disableLayer = useCallback(() => {
    releaseRuntime();
    setContextReady(false);
    setDisabled(true);
    onUnavailable?.();
  }, [onUnavailable, releaseRuntime]);

  const handleContextCreate = useCallback(
    (context: ExpoWebGLRenderingContext) => {
      if (disabled) {
        return;
      }

      try {
        const gl = context as ExpoGlRuntimeContext;
        const program = createProgram(gl);
        glRef.current = gl;
        programRef.current = program;
        setContextReady(true);
      } catch {
        disableLayer();
      }
    },
    [disabled, disableLayer],
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

    try {
      const renderLayoutSize: CanvasLayoutSize = {
        height: layoutHeight,
        width: layoutWidth,
      };
      const renderSize = resolveRenderSize(gl, renderLayoutSize);
      const cache = model ? resolveThumbnailCache(cacheRef, gl, model) : null;
      if (!cache) {
        resetThumbnailCache(cacheRef);
      }

      const uploadedThumbnails =
        model && cache
          ? buildUploadedThumbnails(gl, model, cache, thumbnails)
          : [];

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
        onUnavailable?.();
      }
    } catch {
      disableLayer();
    }
  }, [
    contextReady,
    disabled,
    disableLayer,
    layoutHeight,
    layoutWidth,
    model,
    onUnavailable,
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