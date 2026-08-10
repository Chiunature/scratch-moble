import { useEffect, useRef } from 'react';
import * as THREE from 'three';

import type { MpdCamera } from '@scratch-mobile/build-guide';
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
import { getLastStepNavigationAt } from '../runtime/stepNavigationSignal';
import type { StepAnimationMode } from '../settings';
import type { BuildGuideBundle } from '../types';
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
import {
  collectRuntimeDrawCalls,
  countRuntimeDrawCallVertices,
} from './sceneDrawCalls';
import {
  isSameRuntimeDrawCallCache,
  pruneRuntimeCaches,
  releaseRuntimeDrawCallCacheRef,
  resolveRuntimeDrawCallCache,
  type RuntimeDrawCallCache,
} from './runtimeDrawCallCache';

type MutableRef<T> = { current: T };

const ANIMATED_PREWARM_DELAY_MS = 160;
/** 停稳超过此时长才预热，避免连点被同步 moveTo/collect 堵死。 */
const PREWARM_IDLE_MS = 520;
const PREWARM_CHAIN_PASSES = 2;
const PREWARM_CHAIN_CONTINUE_MAX_MS = 300;
const PREWARM_CHAIN_CONTINUE_MAX_VERTICES = 200_000;
/** 两次点击间隔（按点击时刻）小于此时长 → 连点，跳过姿态动画。 */
const RAPID_STEP_NAVIGATION_MS = 450;

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

function cancelScheduledPrewarmTimeout(
  prewarmTimeoutRef: MutableRef<ReturnType<typeof setTimeout> | null>,
): void {
  if (prewarmTimeoutRef.current) {
    clearTimeout(prewarmTimeoutRef.current);
    prewarmTimeoutRef.current = null;
  }
}

type UseExpoGlStepSceneParams = {
  bundle: BuildGuideBundle;
  stepCamera?: MpdCamera;
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
  stepCamera,
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
  const lastStepNavigatedAtRef = useRef(0);
  const prewarmEpochRef = useRef(0);
  const animationModeRef = useRef(animationMode);
  const appearanceRevisionRef = useRef(appearanceRevision);
  const uploadedSceneRef = useRef<{
    gl: ExpoGlRuntimeContext;
    stepHandler: NonNullable<BuildGuideBundle['stepHandler']>;
    stepIndex: number;
    mode: LdrDisplayMode;
    appearanceRevision: number;
  } | null>(null);
  const drawCallCacheRef = useRef<RuntimeDrawCallCache | null>(null);
  const prewarmTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );

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

    const currentAppearanceRevision = appearanceRevisionRef.current;
    const uploadedScene = uploadedSceneRef.current;
    const existingRuntimeCache = drawCallCacheRef.current;
    const runtimeCacheReusable =
      existingRuntimeCache != null &&
      isSameRuntimeDrawCallCache(
        existingRuntimeCache,
        gl,
        stepHandler,
        mode,
        currentAppearanceRevision,
      );
    const geometryDirty =
      !uploadedScene ||
      uploadedScene.gl !== gl ||
      uploadedScene.stepHandler !== stepHandler ||
      uploadedScene.stepIndex !== stepIndex ||
      uploadedScene.mode !== mode ||
      uploadedScene.appearanceRevision !== currentAppearanceRevision ||
      !runtimeCacheReusable;
    const drawCallCache = resolveRuntimeDrawCallCache(
      drawCallCacheRef,
      gl,
      stepHandler,
      mode,
      currentAppearanceRevision,
    );
    const totalSteps = stepHandler.getTotalSteps();
    const currentStepBefore = stepHandler.getCurrentStepIndex();
    const navigationDirection = stepIndex - currentStepBefore < 0 ? -1 : 1;

    const cancelScheduledPrewarm = () => {
      prewarmEpochRef.current += 1;
      cancelScheduledPrewarmTimeout(prewarmTimeoutRef);
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
          drawCallCache.drawCallsByStep,
          PREWARM_CHAIN_PASSES,
        );

      const firstMissing = resolvePrewarmStepIndex();
      if (firstMissing == null) {
        return;
      }

      cancelScheduledPrewarm();
      const epoch = prewarmEpochRef.current;
      const idleDelayMs = PREWARM_IDLE_MS;

      const runPrewarm = (remainingPasses: number) => {
        prewarmTimeoutRef.current = null;

        if (epoch !== prewarmEpochRef.current) {
          return;
        }

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

          if (epoch !== prewarmEpochRef.current) {
            return;
          }

          if (appearanceRevisionRef.current > 0) {
            stepHandler.refreshAppearance();
          }

          root.updateMatrixWorld(true);

          const drawCalls = collectRuntimeDrawCalls(
            root,
            drawCallCache.sceneDrawCallCache,
          );

          if (epoch !== prewarmEpochRef.current) {
            return;
          }

          drawCallCache.drawCallsByStep.set(prewarmStepIndex, drawCalls);
          uploadRuntimeDrawCalls(gl, drawCalls, drawCallCache.uploadCache);
          pruneRuntimeCaches(drawCallCache, stepIndex, totalSteps);

          warmedTotalMs = Date.now() - prewarmStartedAt;
          warmedVertexCount = countRuntimeDrawCallVertices(drawCalls);
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

        if (epoch !== prewarmEpochRef.current) {
          return;
        }

        if (
          remainingPasses <= 1 ||
          warmedTotalMs > PREWARM_CHAIN_CONTINUE_MAX_MS ||
          warmedVertexCount > PREWARM_CHAIN_CONTINUE_MAX_VERTICES ||
          resolvePrewarmStepIndex() == null
        ) {
          return;
        }

        prewarmTimeoutRef.current = setTimeout(() => {
          runPrewarm(remainingPasses - 1);
        }, ANIMATED_PREWARM_DELAY_MS);
      };

      prewarmTimeoutRef.current = setTimeout(() => {
        if (epoch !== prewarmEpochRef.current) {
          return;
        }
        runPrewarm(PREWARM_CHAIN_PASSES);
      }, idleDelayMs);
    };

    const bakeAndRender = () => {
      root.updateMatrixWorld(true);

      if (camera instanceof THREE.OrthographicCamera) {
        orbitRef.current.zoom = camera.zoom;
      }

      let drawCalls = drawCallCache.drawCallsByStep.get(stepIndex);
      if (!drawCalls) {
        drawCalls = collectRuntimeDrawCalls(
          root,
          drawCallCache.sceneDrawCallCache,
        );
        drawCallCache.drawCallsByStep.set(stepIndex, drawCalls);
      }

      pruneRuntimeCaches(drawCallCache, stepIndex, totalSteps);

      const nextFrame = uploadRuntimeDrawCalls(
        gl,
        drawCalls,
        drawCallCache.uploadCache,
      );
      disposeUploadedFrame(gl, uploadedFrameRef.current);

      uploadedFrameRef.current = nextFrame;
      uploadedSceneRef.current = {
        gl,
        stepHandler,
        stepIndex,
        mode,
        appearanceRevision: currentAppearanceRevision,
      };

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

        const stepDelta = Math.abs(stepIndex - currentStepBefore);
        const navigateAt = getLastStepNavigationAt();
        const previousNavigateAt = lastStepNavigatedAtRef.current;
        lastStepNavigatedAtRef.current = navigateAt;
        const clickGapMs =
          previousNavigateAt > 0 ? navigateAt - previousNavigateAt : -1;
        const rapidNavigation =
          previousNavigateAt > 0 && clickGapMs < RAPID_STEP_NAVIGATION_MS;

        const skipAnimation =
          isFirstStepRef.current ||
          modeNow === 2 ||
          !geometryDirty ||
          stepDelta > 1 ||
          rapidNavigation;
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

        // bake + React 提交可能堵住主线程；延后一帧再开动画，避免首帧时间跳跃。
        let stopAnim: (() => void) | null = null;
        const startAnimRaf = requestAnimationFrame(() => {
          stopAnim = animateInstructionTransition(
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
        });
        cancelStepAnimRef.current = () => {
          cancelAnimationFrame(startAnimRaf);
          stopAnim?.();
          stopAnim = null;
        };

        return cleanup;
      }

      moveToStepIfNeeded();

      const orbitTarget = applyStepToScene(
        camera,
        root,
        stepIndex,
        stepCamera,
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
    stepCamera,
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
    cancelScheduledPrewarmTimeout(prewarmTimeoutRef);
    const drawCallCache = resolveRuntimeDrawCallCache(
      drawCallCacheRef,
      gl,
      stepHandler,
      mode,
      appearanceRevision,
    );

    try {
      stepHandler.refreshAppearance();

      const root = stepHandler.getRoot();
      rootRef.current = root;

      root.updateMatrixWorld(true);

      const drawCalls = collectRuntimeDrawCalls(
        root,
        drawCallCache.sceneDrawCallCache,
      );
      const currentStepIndex = stepHandler.getCurrentStepIndex();
      drawCallCache.drawCallsByStep.set(currentStepIndex, drawCalls);
      pruneRuntimeCaches(
        drawCallCache,
        currentStepIndex,
        stepHandler.getTotalSteps(),
      );

      const nextFrame = uploadRuntimeDrawCalls(
        gl,
        drawCalls,
        drawCallCache.uploadCache,
      );
      disposeUploadedFrame(gl, uploadedFrameRef.current);

      uploadedFrameRef.current = nextFrame;
      uploadedSceneRef.current = {
        gl,
        stepHandler,
        stepIndex: currentStepIndex,
        mode,
        appearanceRevision,
      };
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

  useEffect(() => {
    if (contextReady && glRef.current) {
      return;
    }

    releaseRuntimeDrawCallCacheRef(drawCallCacheRef, glRef.current);
    uploadedSceneRef.current = null;
  }, [contextReady, glRef]);

  useEffect(
    () => () => {
      cancelScheduledPrewarmTimeout(prewarmTimeoutRef);
      cancelStepAnimRef.current?.();
      cancelStepAnimRef.current = null;
      releaseRuntimeDrawCallCacheRef(drawCallCacheRef, glRef.current);
      uploadedSceneRef.current = null;
    },
    [glRef],
  );
}