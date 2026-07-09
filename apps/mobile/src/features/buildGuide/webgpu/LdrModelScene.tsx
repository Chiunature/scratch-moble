import React, { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';

import type { BuildGuideStep } from '../types';
import { applyStepToScene, disposeObject3D } from './applyStepToScene';
import type {
  LdrDisplayMode,
  LdrStepHandlerFacade,
} from '@scratch-mobile/ldr-engine';

type LdrModelSceneProps = {
  stepHandler: LdrStepHandlerFacade;
  step: BuildGuideStep | undefined;
  stepIndex: number;
  mode: LdrDisplayMode;
};

export function LdrModelScene({
  stepHandler,
  step,
  stepIndex,
  mode,
}: LdrModelSceneProps) {
  const { camera, size } = useThree();
  const root = useMemo(() => stepHandler.getRoot(), [stepHandler]);
  const lastCameraState = useRef<number[]>([]);

  // WebGPU 条件线 CPU 裁剪：相机矩阵变化时才更新（见 applyWebGpuMaterials.js）
  useFrame(() => {
    const updateConditionalLines = globalThis.LDR?.updateWebGpuConditionalLines;
    if (!updateConditionalLines) {
      return;
    }

    const state = [
      ...camera.projectionMatrix.elements,
      ...camera.matrixWorldInverse.elements,
    ];
    const prev = lastCameraState.current;
    const unchanged =
      prev.length === state.length &&
      prev.every((value, index) => value === state[index]);

    if (unchanged) {
      return;
    }

    lastCameraState.current = state;
    updateConditionalLines(root, camera);
  });

  useEffect(() => {
    stepHandler.moveTo(stepIndex);
  }, [stepHandler, stepIndex]);

  useEffect(() => {
    applyStepToScene(
      camera,
      root,
      step,
      stepIndex,
      stepHandler,
      size,
      mode,
    );
    // 步骤切换会改 root 旋转/相机 zoom，需立即刷新条件线
    lastCameraState.current = [];
    globalThis.LDR?.updateWebGpuConditionalLines?.(root, camera);
  }, [camera, mode, root, size, step, stepHandler, stepIndex]);

  useEffect(() => {
    return () => {
      disposeObject3D(root);
    };
  }, [root]);

  return <primitive object={root} />;
}
