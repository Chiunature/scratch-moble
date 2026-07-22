import React from 'react';
import { ActivityIndicator, Text, View } from 'react-native';

import type { StepAnimationMode } from '../settings';
import type { BuildGuideBundle } from '../types';
import { BuildGuideWebGpuCanvas } from '../webgpu/BuildGuideWebGpuCanvas';

type BuildGuideRuntimeCanvasProps = {
  bundle: BuildGuideBundle;
  stepIndex: number;
  animationMode: StepAnimationMode;
  appearanceRevision: number;
};

export function BuildGuideRuntimeCanvas({
  bundle,
  stepIndex,
  animationMode,
  appearanceRevision,
}: BuildGuideRuntimeCanvasProps) {
  if (bundle.error) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          padding: 16,
        }}
      >
        <Text style={{ color: '#fff', textAlign: 'center' }}>
          {bundle.error.message}
        </Text>
      </View>
    );
  }

  if (!bundle.stepHandler || bundle.loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color="#ffffff" />
      </View>
    );
  }

  return (
    <BuildGuideWebGpuCanvas
      bundle={bundle}
      stepIndex={stepIndex}
      animationMode={animationMode}
      appearanceRevision={appearanceRevision}
    />
  );
}
