import React, { useEffect, useMemo, useRef } from 'react';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';

import type { LdrDisplayMode, LdrStepHandlerFacade } from '@scratch-mobile/ldr-engine';

import type { StepAnimationMode } from '../settings';
import type { BuildGuideStep } from '../types';
import {
  animateInstructionTransition,
  applyInstructionPose,
  captureInstructionPose,
  type InstructionPose,
} from './animateStepTransition';
import {
  applyStepToScene,
  computeInstructionStepTarget,
} from './applyStepToScene';
import { stabilizeWebGpuStep } from './stabilizeWebGpuStep';

type LdrModelSceneProps = {
  stepHandler: LdrStepHandlerFacade;
  step: BuildGuideStep | undefined;
  stepIndex: number;
  mode: LdrDisplayMode;
  animationMode: StepAnimationMode;
  /** 高亮/对比度变更时递增，触发外观刷新（不切步动画） */
  appearanceRevision: number;
};

/**
 * 说明书 3D 场景：切步 → 取景（可动画）→ WebGPU 稳定化。
 */
export function LdrModelScene({
  stepHandler,
  step,
  stepIndex,
  mode,
  animationMode,
  appearanceRevision,
}: LdrModelSceneProps) {
  const { camera, size } = useThree();
  const root = useMemo(() => stepHandler.getRoot(), [stepHandler]);
  const isFirstStepRef = useRef(true);
  const cancelAnimRef = useRef<(() => void) | null>(null);
  const animationModeRef = useRef(animationMode);
  animationModeRef.current = animationMode;

  // 切步 + 相机动画（改动画速度不重跑本 effect）
  useEffect(() => {
    cancelAnimRef.current?.();
    cancelAnimRef.current = null;

    const runStabilize = () => {
      stabilizeWebGpuStep(root, camera);
    };

    if (
      mode === 'instruction' &&
      camera instanceof THREE.OrthographicCamera &&
      size.width > 0 &&
      size.height > 0
    ) {
      const from: InstructionPose = captureInstructionPose(root, camera);
      const modeNow = animationModeRef.current;

      stepHandler.moveTo(stepIndex);

      const target = computeInstructionStepTarget(
        camera,
        root,
        stepHandler,
        size,
      );
      const to: InstructionPose = {
        position: target.position.clone(),
        quaternion: new THREE.Quaternion().setFromRotationMatrix(
          target.rotation,
        ),
        zoom: target.zoom,
      };

      applyInstructionPose(root, camera, from);
      runStabilize();

      const skipAnimation = isFirstStepRef.current || modeNow === 2;
      isFirstStepRef.current = false;

      if (skipAnimation) {
        applyInstructionPose(root, camera, to);
        runStabilize();
        return;
      }

      cancelAnimRef.current = animateInstructionTransition(
        root,
        camera,
        from,
        to,
        modeNow,
        runStabilize,
      );
      return () => {
        cancelAnimRef.current?.();
        cancelAnimRef.current = null;
      };
    }

    stepHandler.moveTo(stepIndex);
    applyStepToScene(
      camera,
      root,
      step,
      stepIndex,
      stepHandler,
      size,
      mode,
    );
    runStabilize();
    isFirstStepRef.current = false;

    return () => {
      cancelAnimRef.current?.();
      cancelAnimRef.current = null;
    };
  }, [camera, mode, root, size, step, stepHandler, stepIndex]);

  useEffect(() => {
    if (appearanceRevision === 0) {
      return;
    }
    stepHandler.refreshAppearance();
    stabilizeWebGpuStep(root, camera);
  }, [appearanceRevision, camera, root, stepHandler]);

  return <primitive object={root} />;
}
