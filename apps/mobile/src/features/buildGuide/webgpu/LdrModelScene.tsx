import React, { useEffect, useMemo } from 'react';
import { useThree } from '@react-three/fiber';

import type { BuildGuideStep } from '../types';
import { applyStepToScene } from './applyStepToScene';
import { stabilizeWebGpuStep } from './stabilizeWebGpuStep';
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

/**
 * 说明书 3D 场景：切步 → 取景 → WebGPU 稳定化。
 * 描边由 FiberCanvas 后处理负责；零件显隐由 ldr-engine scale 方案负责。
 */
export function LdrModelScene({
  stepHandler,
  step,
  stepIndex,
  mode,
}: LdrModelSceneProps) {
  const { camera, size } = useThree();
  const root = useMemo(() => stepHandler.getRoot(), [stepHandler]);

  useEffect(() => {
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
    stabilizeWebGpuStep(root, camera);
  }, [camera, mode, root, size, step, stepHandler, stepIndex]);

  return <primitive object={root} />;
}
