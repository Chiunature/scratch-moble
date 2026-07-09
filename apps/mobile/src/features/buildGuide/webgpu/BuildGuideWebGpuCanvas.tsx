/**
 * BuildGuide 3D 画布入口（RN WebGPU + R3F）。
 *
 * 调用链：
 *   BuildGuideScreen
 *     → BuildGuideRuntimeCanvas（loading / error）
 *     → BuildGuideWebGpuCanvas（本文件）
 *         → FiberCanvas（WebGPU renderer + R3F root）
 *         → LdrModelScene（moveTo + applyStepToScene）
 *
 * 相机策略：
 *   - instruction：正交相机 + LDraw step/orientation 对齐
 *   - preview：透视相机 + 已经 fitObjectToView 的静态整模
 */
import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import * as THREE from 'three';

import { resolveStepViewModel } from '@scratch-mobile/build-guide';
import type { LdrDisplayMode } from '@scratch-mobile/ldr-engine';

import type { BuildGuideBundle } from '../types';
import { FiberCanvas } from './FiberCanvas';
import { LdrModelScene } from './LdrModelScene';
import useOrbitControls from './useOrbitControls';

type BuildGuideCamera = THREE.PerspectiveCamera | THREE.OrthographicCamera;

function createBuildGuideCamera(mode: LdrDisplayMode): BuildGuideCamera {
  if (mode === 'preview') {
    return new THREE.PerspectiveCamera(45, 1, 0.01, 1000);
  }

  return new THREE.OrthographicCamera(-1, 1, 1, -1, 0.01, 1000);
}

function resolveDisplayMode(bundle: BuildGuideBundle): LdrDisplayMode {
  return bundle.model?.mode ?? bundle.manifest.mode ?? 'instruction';
}

function BuildGuideScene({
  bundle,
  stepIndex,
  mode,
}: {
  bundle: BuildGuideBundle;
  stepIndex: number;
  mode: LdrDisplayMode;
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
      mode={mode}
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
  const mode = resolveDisplayMode(bundle);
  const camera = useMemo(() => createBuildGuideCamera(mode), [mode]);

  return (
    <View style={styles.container} {...events}>
      <FiberCanvas style={styles.canvas} camera={camera}>
        <ambientLight intensity={0.65} />
        <directionalLight intensity={1.1} position={[4, 6, 3]} />
        <OrbitControls enablePan={false} dampingFactor={0.08} />
        <BuildGuideScene bundle={bundle} stepIndex={stepIndex} mode={mode} />
      </FiberCanvas>
    </View>
  );
}

const styles = StyleSheet.create({
  canvas: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
});
