import React, { useEffect, useMemo } from 'react';
import { useThree } from '@react-three/fiber';

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
  }, [camera, mode, root, size, step, stepHandler, stepIndex]);

  useEffect(() => {
    return () => {
      disposeObject3D(root);
    };
  }, [root]);

  return <primitive object={root} />;
}
