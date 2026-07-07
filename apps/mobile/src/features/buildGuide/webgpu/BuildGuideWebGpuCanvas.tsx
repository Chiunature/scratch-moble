import React, { useMemo } from 'react';
import { View } from 'react-native';
import * as THREE from 'three';

import { resolveStepViewModel } from '@scratch-mobile/build-guide';

import type { BuildGuideBundle } from '../types';
import { FiberCanvas } from './FiberCanvas';
import { LdrModelScene } from './LdrModelScene';
import useOrbitControls from './useOrbitControls';

function BuildGuideScene({
  bundle,
  stepIndex,
}: {
  bundle: BuildGuideBundle;
  stepIndex: number;
}) {
  const totalSteps = bundle.stepHandler?.getTotalSteps() ?? 0;
  const step = useMemo(
    () =>
      bundle.stepHandler
        ? resolveStepViewModel(bundle.manifest, stepIndex, totalSteps)
        : undefined,
    [bundle.manifest, bundle.stepHandler, stepIndex, totalSteps],
  );

  if (!bundle.stepHandler || !step) {
    return null;
  }

  return (
    <LdrModelScene
      stepHandler={bundle.stepHandler}
      step={step}
      stepIndex={stepIndex}
    />
  );
}

type BuildGuideWebGpuCanvasProps = {
  bundle: BuildGuideBundle;
  stepIndex: number;
};

export function BuildGuideWebGpuCanvas({
  bundle,
  stepIndex,
}: BuildGuideWebGpuCanvasProps) {
  const [OrbitControls, events] = useOrbitControls();
  const camera = useMemo(
    () => new THREE.OrthographicCamera(-1, 1, 1, -1, 0.01, 1000),
    [],
  );

  return (
    <View style={{ flex: 1 }} {...events}>
      <FiberCanvas style={{ flex: 1 }} camera={camera}>
        <ambientLight intensity={0.65} />
        <directionalLight intensity={1.1} position={[4, 6, 3]} />
        <OrbitControls enablePan={false} dampingFactor={0.08} />
        <BuildGuideScene bundle={bundle} stepIndex={stepIndex} />
      </FiberCanvas>
    </View>
  );
}
