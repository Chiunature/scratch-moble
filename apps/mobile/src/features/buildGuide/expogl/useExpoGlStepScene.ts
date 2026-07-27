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
  UploadedFrame,
} from './glTypes';
import { captureOrbitFromCamera, type OrbitState } from './orbitState';
import { formatRuntimeError } from './runtimeError';
import { collectRuntimeDrawCalls } from './sceneDrawCalls';

type MutableRef<T> = { current: T };

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

    const cleanup = () => {
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

    const bakeAndRender = () => {
      root.updateMatrixWorld(true);
      if (camera instanceof THREE.OrthographicCamera) {
        orbitRef.current.zoom = camera.zoom;
      }
      const nextFrame = uploadRuntimeDrawCalls(
        gl,
        collectRuntimeDrawCalls(root),
      );
      disposeUploadedFrame(gl, uploadedFrameRef.current);
      uploadedFrameRef.current = nextFrame;
      uploadedSceneRef.current = { gl, stepHandler, stepIndex };
      renderFrame();
    };

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

        if (geometryDirty) {
          stepHandler.moveTo(stepIndex);
          if (appearanceRevisionRef.current > 0) {
            stepHandler.refreshAppearance();
          }
        }

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
          },
          () => {
            orbitRef.current.zoom = camera.zoom;
            renderPoseFrame();
          },
        );

        return cleanup;
      }

      if (geometryDirty) {
        stepHandler.moveTo(stepIndex);
        if (appearanceRevisionRef.current > 0) {
          stepHandler.refreshAppearance();
        }
      }

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
    } catch (cause: unknown) {
      renderFailedRef.current = true;
      setRenderError(formatRuntimeError(cause));
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

    try {
      bundle.stepHandler.refreshAppearance();
      const root = bundle.stepHandler.getRoot();
      rootRef.current = root;
      root.updateMatrixWorld(true);
      const nextFrame = uploadRuntimeDrawCalls(
        gl,
        collectRuntimeDrawCalls(root),
      );
      disposeUploadedFrame(gl, uploadedFrameRef.current);
      uploadedFrameRef.current = nextFrame;
      renderFailedRef.current = false;
      setRenderError(null);
      renderFrame();
    } catch (cause: unknown) {
      renderFailedRef.current = true;
      setRenderError(formatRuntimeError(cause));
    }
  }, [
    appearanceRevision,
    bundle.stepHandler,
    contextReady,
    glRef,
    renderFailedRef,
    renderFrame,
    rootRef,
    setRenderError,
    uploadedFrameRef,
  ]);

  useEffect(
    () => () => {
      cancelStepAnimRef.current?.();
      cancelStepAnimRef.current = null;
    },
    [],
  );
}