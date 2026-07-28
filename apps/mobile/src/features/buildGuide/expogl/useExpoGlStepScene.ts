import { useEffect, useRef } from 'react';
import * as THREE from 'three';

import type { LdrDisplayMode } from '@scratch-mobile/ldr-engine';

import {
  animateInstructionTransition,
  applyInstructionPose,
  captureInstructionPose,
  type InstructionPose,
} from '../runtime/animateStepTransition';
import {
  applyStepToScene,
  computeInstructionStepTarget,
} from '../runtime/applyStepToScene';
import type { StepAnimationMode } from '../settings';
import type { BuildGuideBundle, BuildGuideStep } from '../types';
import {
  disposeUploadedFrame,
  resolveRenderSize,
  uploadRuntimeDrawCalls,
} from './glFrameRenderer';
import type {
  BuildGuideCamera,
  CanvasLayoutSize,
  ExpoGlRuntimeContext,
  RenderSize,
  RuntimeDrawCall,
  UploadedFrame,
} from './glTypes';
import { captureOrbitFromCamera, type OrbitState } from './orbitState';
import { formatRuntimeError } from './runtimeError';
import { collectRuntimeDrawCalls } from './sceneDrawCalls';

type MutableRef<T> = { current: T };

type RuntimeDrawCallCache = {
  stepHandler: NonNullable<BuildGuideBundle['stepHandler']>;
  mode: LdrDisplayMode;
  appearanceRevision: number;
  entries: Map<number, RuntimeDrawCall[]>;
};

const DRAW_CALL_CACHE_RADIUS = 5;
const ANIMATED_PREWARM_DELAY_MS = 160;
const SKIP_ANIMATION_PREWARM_DELAY_MS = 24;
const PREWARM_CHAIN_PASSES = 2;
const PREWARM_CHAIN_CONTINUE_MAX_MS = 300;
const PREWARM_CHAIN_CONTINUE_MAX_VERTICES = 200_000;

function findMissingPrewarmStepIndex(
  stepIndex: number,
  navigationDirection: -1 | 1,
  totalSteps: number,
  cachedSteps: ReadonlyMap<number, RuntimeDrawCall[]>,
  maxDistance: number,
): number | undefined {
  for (let distance = 1; distance <= maxDistance; distance += 1) {
    const forwardStepIndex = stepIndex + navigationDirection * distance;
    if (
      forwardStepIndex >= 0 &&
      forwardStepIndex < totalSteps &&
      !cachedSteps.has(forwardStepIndex)
    ) {
      return forwardStepIndex;
    }
  }

  for (let distance = 1; distance <= maxDistance; distance += 1) {
    const fallbackStepIndex = stepIndex - navigationDirection * distance;
    if (
      fallbackStepIndex >= 0 &&
      fallbackStepIndex < totalSteps &&
      !cachedSteps.has(fallbackStepIndex)
    ) {
      return fallbackStepIndex;
    }
  }

  return undefined;
}

function cancelScheduledPrewarmRefs(
  prewarmTimeoutRef: MutableRef<ReturnType<typeof setTimeout> | null>,
  prewarmRafRef: MutableRef<
    ReturnType<typeof requestAnimationFrame> | null
  >,
): void {
  if (prewarmRafRef.current != null) {
    cancelAnimationFrame(prewarmRafRef.current);
    prewarmRafRef.current = null;
  }

  if (prewarmTimeoutRef.current) {
    clearTimeout(prewarmTimeoutRef.current);
    prewarmTimeoutRef.current = null;
  }
}

function resolveRuntimeDrawCallCache(
  cacheRef: MutableRef<RuntimeDrawCallCache | null>,
  stepHandler: NonNullable<BuildGuideBundle['stepHandler']>,
  mode: LdrDisplayMode,
  appearanceRevision: number,
): RuntimeDrawCallCache {
  const cache = cacheRef.current;
  if (
    cache &&
    cache.stepHandler === stepHandler &&
    cache.mode === mode &&
    cache.appearanceRevision === appearanceRevision
  ) {
    return cache;
  }

  const nextCache = {
    stepHandler,
    mode,
    appearanceRevision,
    entries: new Map<number, RuntimeDrawCall[]>(),
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

  for (const cachedStep of cache.entries.keys()) {
    if (!keep.has(cachedStep)) {
      cache.entries.delete(cachedStep);
    }
  }
}

function countDrawCallVertices(drawCalls: RuntimeDrawCall[]): number {
  return drawCalls.reduce((sum, call) => sum + call.positions.length / 3, 0);
}

type UseExpoGlStepSceneParams = {
  bundle: BuildGuideBundle;
  step: BuildGuideStep | undefined;
  stepIndex: number;
  mode: LdrDisplayMode;
  camera: BuildGuideCamera;
  contextReady: boolean;
  layoutSize: CanvasLayoutSize | null;
  animationMode: StepAnimationMode;
  appearanceRevision: number;
  glRef: MutableRef<ExpoGlRuntimeContext | null>;
  rootRef: MutableRef<THREE.Object3D | null>;
  uploadedFrameRef: MutableRef<UploadedFrame | null>;
  renderSizeRef: MutableRef<RenderSize | null>;
  renderFailedRef: MutableRef<boolean>;
  orbitRef: MutableRef<OrbitState>;
  orbitTargetRef: MutableRef<THREE.Vector3>;
  renderFrame: () => void;
  stopOrbitLoop: () => void;
  resetGesture: () => void;
  setRenderError: (message: string | null) => void;
};

export function useExpoGlStepScene({
  bundle,
  step,
  stepIndex,
  mode,
  camera,
  contextReady,
  layoutSize,
  animationMode,
  appearanceRevision,
  glRef,
  rootRef,
  uploadedFrameRef,
  renderSizeRef,
  renderFailedRef,
  orbitRef,
  orbitTargetRef,
  renderFrame,
  stopOrbitLoop,
  resetGesture,
  setRenderError,
}: UseExpoGlStepSceneParams): void {
  const cancelStepAnimRef = useRef<(() => void) | null>(null);
  const isFirstStepRef = useRef(true);
  const animationModeRef = useRef(animationMode);
  const appearanceRevisionRef = useRef(appearanceRevision);
  const uploadedSceneRef = useRef<{
    gl: ExpoGlRuntimeContext;
    stepHandler: NonNullable<BuildGuideBundle['stepHandler']>;
    stepIndex: number;
  } | null>(null);
  const drawCallCacheRef = useRef<RuntimeDrawCallCache | null>(null);
  const prewarmTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const prewarmRafRef = useRef<ReturnType<
    typeof requestAnimationFrame
  > | null>(null);

  animationModeRef.current = animationMode;
  appearanceRevisionRef.current = appearanceRevision;

  useEffect(() => {
    if (!contextReady || !layoutSize || !bundle.stepHandler) {
      return;
    }

    const gl = glRef.current;
    if (!gl) {
      return;
    }

    const stepHandler = bundle.stepHandler;
    const root = stepHandler.getRoot();
    rootRef.current = root;

    const geometryDirty =
      !uploadedSceneRef.current ||
      uploadedSceneRef.current.gl !== gl ||
      uploadedSceneRef.current.stepHandler !== stepHandler ||
      uploadedSceneRef.current.stepIndex !== stepIndex;
    const drawCallCache = resolveRuntimeDrawCallCache(
      drawCallCacheRef,
      stepHandler,
      mode,
      appearanceRevisionRef.current,
    );
    const totalSteps = stepHandler.getTotalSteps();
    const currentStepBefore = stepHandler.getCurrentStepIndex();
    const navigationDirection = stepIndex - currentStepBefore < 0 ? -1 : 1;

    const cancelScheduledPrewarm = () => {
      cancelScheduledPrewarmRefs(prewarmTimeoutRef, prewarmRafRef);
    };

    const moveToStepIfNeeded = () => {
      if (!geometryDirty) {
        return;
      }

      stepHandler.moveTo(stepIndex);

      if (appearanceRevisionRef.current > 0) {
        stepHandler.refreshAppearance();
      }
    };

    const cleanup = () => {
      cancelScheduledPrewarm();
      cancelStepAnimRef.current?.();
      cancelStepAnimRef.current = null;
      if (rootRef.current === root) {
        rootRef.current = null;
      }
    };

    const renderPoseFrame = () => {
      root.updateMatrixWorld(true);
      if (camera instanceof THREE.OrthographicCamera) {
        orbitRef.current.zoom = camera.zoom;
      }
      renderFrame();
    };

    const scheduleAdjacentPrewarm = () => {
      const resolvePrewarmStepIndex = () =>
        findMissingPrewarmStepIndex(
          stepIndex,
          navigationDirection,
          totalSteps,
          drawCallCache.entries,
          PREWARM_CHAIN_PASSES,
        );

      if (resolvePrewarmStepIndex() == null) {
        return;
      }

      cancelScheduledPrewarm();

      const runPrewarm = (remainingPasses: number) => {
        prewarmTimeoutRef.current = null;

        const prewarmStepIndex = resolvePrewarmStepIndex();
        if (
          prewarmStepIndex == null ||
          renderFailedRef.current ||
          glRef.current !== gl ||
          drawCallCacheRef.current !== drawCallCache ||
          stepHandler.getCurrentStepIndex() !== stepIndex
        ) {
          return;
        }

        const prewarmStartedAt = Date.now();
        let warmedTotalMs = 0;
        let warmedVertexCount = 0;
        const restoreStepIndex = stepHandler.getCurrentStepIndex();
        const rootPosition = root.position.clone();
        const rootQuaternion = root.quaternion.clone();
        const rootScale = root.scale.clone();
        const cameraPosition = camera.position.clone();
        const cameraQuaternion = camera.quaternion.clone();
        const cameraZoom =
          camera instanceof THREE.OrthographicCamera ? camera.zoom : null;

        try {
          stepHandler.moveTo(prewarmStepIndex);

          if (appearanceRevisionRef.current > 0) {
            stepHandler.refreshAppearance();
          }

          root.updateMatrixWorld(true);

          const drawCalls = collectRuntimeDrawCalls(root);

          drawCallCache.entries.set(prewarmStepIndex, drawCalls);
          pruneRuntimeDrawCallCache(drawCallCache, stepIndex, totalSteps);

          warmedTotalMs = Date.now() - prewarmStartedAt;
          warmedVertexCount = countDrawCallVertices(drawCalls);
        } catch {
          return;
        } finally {
          stepHandler.moveTo(restoreStepIndex);
          if (appearanceRevisionRef.current > 0) {
            stepHandler.refreshAppearance();
          }

          root.position.copy(rootPosition);
          root.quaternion.copy(rootQuaternion);
          root.scale.copy(rootScale);
          root.updateMatrixWorld(true);
          camera.position.copy(cameraPosition);
          camera.quaternion.copy(cameraQuaternion);
          if (
            camera instanceof THREE.OrthographicCamera &&
            cameraZoom != null
          ) {
            camera.zoom = cameraZoom;
          }
          camera.updateProjectionMatrix();
        }

        if (
          remainingPasses <= 1 ||
          warmedTotalMs > PREWARM_CHAIN_CONTINUE_MAX_MS ||
          warmedVertexCount > PREWARM_CHAIN_CONTINUE_MAX_VERTICES ||
          resolvePrewarmStepIndex() == null
        ) {
          return;
        }

        prewarmTimeoutRef.current = setTimeout(
          () => runPrewarm(remainingPasses - 1),
          prewarmDelayMs,
        );
      };

      const prewarmDelayMs =
        animationModeRef.current === 2
          ? SKIP_ANIMATION_PREWARM_DELAY_MS
          : ANIMATED_PREWARM_DELAY_MS;
      const prewarmFrameDelay = animationModeRef.current === 2 ? 1 : 2;

      const schedulePrewarmStart = (remainingFrames: number) => {
        if (remainingFrames <= 0) {
          prewarmTimeoutRef.current = setTimeout(
            () => runPrewarm(PREWARM_CHAIN_PASSES),
            prewarmDelayMs,
          );
          return;
        }

        prewarmRafRef.current = requestAnimationFrame(() => {
          prewarmRafRef.current = null;
          schedulePrewarmStart(remainingFrames - 1);
        });
      };

      schedulePrewarmStart(prewarmFrameDelay);
    };

    const bakeAndRender = () => {
      root.updateMatrixWorld(true);

      if (camera instanceof THREE.OrthographicCamera) {
        orbitRef.current.zoom = camera.zoom;
      }

      let drawCalls = drawCallCache.entries.get(stepIndex);
      if (!drawCalls) {
        drawCalls = collectRuntimeDrawCalls(root);
        drawCallCache.entries.set(stepIndex, drawCalls);
      }

      pruneRuntimeDrawCallCache(drawCallCache, stepIndex, totalSteps);

      const nextFrame = uploadRuntimeDrawCalls(gl, drawCalls);
      disposeUploadedFrame(gl, uploadedFrameRef.current);

      uploadedFrameRef.current = nextFrame;
      uploadedSceneRef.current = { gl, stepHandler, stepIndex };

      renderFrame();
    };

    cancelScheduledPrewarm();
    cancelStepAnimRef.current?.();
    cancelStepAnimRef.current = null;
    stopOrbitLoop();
    resetGesture();
    renderSizeRef.current = resolveRenderSize(gl, layoutSize);
    renderFailedRef.current = false;
    setRenderError(null);

    try {
      if (
        mode === 'instruction' &&
        camera instanceof THREE.OrthographicCamera
      ) {
        const from: InstructionPose = captureInstructionPose(root, camera);
        const modeNow = animationModeRef.current;

        moveToStepIfNeeded();

        const target = computeInstructionStepTarget(
          camera,
          root,
          stepHandler,
          layoutSize,
        );
        const to: InstructionPose = {
          position: target.position.clone(),
          quaternion: new THREE.Quaternion().setFromRotationMatrix(
            target.rotation,
          ),
          zoom: target.zoom,
        };

        orbitTargetRef.current.set(0, 0, 0);

        const skipAnimation =
          isFirstStepRef.current || modeNow === 2 || !geometryDirty;
        isFirstStepRef.current = false;

        if (skipAnimation) {
          applyInstructionPose(root, camera, to);
          orbitRef.current = captureOrbitFromCamera(
            camera,
            orbitTargetRef.current,
          );
          orbitRef.current.zoom = to.zoom;
          if (geometryDirty) {
            bakeAndRender();
          } else {
            renderPoseFrame();
          }
          scheduleAdjacentPrewarm();
          return cleanup;
        }

        applyInstructionPose(root, camera, from);
        orbitRef.current = captureOrbitFromCamera(
          camera,
          orbitTargetRef.current,
        );
        orbitRef.current.zoom = from.zoom;
        bakeAndRender();

        cancelStepAnimRef.current = animateInstructionTransition(
          root,
          camera,
          from,
          to,
          modeNow,
          () => {
            orbitRef.current.zoom = to.zoom;
            renderPoseFrame();
            scheduleAdjacentPrewarm();
          },
          () => {
            orbitRef.current.zoom = camera.zoom;
            renderPoseFrame();
          },
        );

        return cleanup;
      }

      moveToStepIfNeeded();

      const orbitTarget = applyStepToScene(
        camera,
        root,
        step,
        stepIndex,
        stepHandler,
        layoutSize,
        mode,
      );
      orbitTargetRef.current.copy(orbitTarget);
      orbitRef.current = captureOrbitFromCamera(
        camera,
        orbitTargetRef.current,
      );
      isFirstStepRef.current = false;
      if (geometryDirty) {
        bakeAndRender();
      } else {
        renderPoseFrame();
      }
      scheduleAdjacentPrewarm();
    } catch (cause: unknown) {
      const message = formatRuntimeError(cause);
      renderFailedRef.current = true;
      setRenderError(message);
    }

    return cleanup;
  }, [
    bundle.stepHandler,
    camera,
    contextReady,
    glRef,
    layoutSize,
    mode,
    orbitRef,
    orbitTargetRef,
    renderFailedRef,
    renderFrame,
    renderSizeRef,
    resetGesture,
    rootRef,
    setRenderError,
    step,
    stepIndex,
    stopOrbitLoop,
    uploadedFrameRef,
  ]);

  useEffect(() => {
    if (
      !contextReady ||
      appearanceRevision === 0 ||
      !bundle.stepHandler
    ) {
      return;
    }

    const gl = glRef.current;
    if (!gl) {
      return;
    }

    const stepHandler = bundle.stepHandler;
    cancelScheduledPrewarmRefs(prewarmTimeoutRef, prewarmRafRef);
    const drawCallCache = resolveRuntimeDrawCallCache(
      drawCallCacheRef,
      stepHandler,
      mode,
      appearanceRevision,
    );

    try {
      stepHandler.refreshAppearance();

      const root = stepHandler.getRoot();
      rootRef.current = root;

      root.updateMatrixWorld(true);

      const drawCalls = collectRuntimeDrawCalls(root);
      const currentStepIndex = stepHandler.getCurrentStepIndex();
      drawCallCache.entries.set(currentStepIndex, drawCalls);
      pruneRuntimeDrawCallCache(
        drawCallCache,
        currentStepIndex,
        stepHandler.getTotalSteps(),
      );

      const nextFrame = uploadRuntimeDrawCalls(gl, drawCalls);
      disposeUploadedFrame(gl, uploadedFrameRef.current);

      uploadedFrameRef.current = nextFrame;
      renderFailedRef.current = false;
      setRenderError(null);

      renderFrame();
    } catch (cause: unknown) {
      const message = formatRuntimeError(cause);
      renderFailedRef.current = true;
      setRenderError(message);
    }
  }, [
    appearanceRevision,
    bundle.stepHandler,
    contextReady,
    glRef,
    mode,
    renderFailedRef,
    renderFrame,
    rootRef,
    setRenderError,
    uploadedFrameRef,
  ]);

  useEffect(
    () => () => {
      cancelScheduledPrewarmRefs(prewarmTimeoutRef, prewarmRafRef);
      cancelStepAnimRef.current?.();
      cancelStepAnimRef.current = null;
    },
    [],
  );
}