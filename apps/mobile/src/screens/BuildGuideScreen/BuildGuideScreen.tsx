import React, { useMemo } from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { warnIfNotHardwareAccelerated } from 'react-native-webgpu';

import {
  BuildGuideRuntimeCanvas,
  BuildGuideSidePanel,
} from '../../features/buildGuide/components';
import { containerDemoManifestParsed } from '../../features/buildGuide/data/bundles';
import { teslaModelSManifestParsed } from '../../features/buildGuide/data/bundles';
import { useBuildGuideSteps } from '../../features/buildGuide/hooks/useBuildGuideSteps';
import { useLdrModel } from '../../features/buildGuide/hooks/useLdrModel';
import type { BuildGuideBundle } from '../../features/buildGuide/types';
import { styles } from './BuildGuideScreen.styles';

export function BuildGuideScreen() {
  const insets = useSafeAreaInsets();
  const ldr = useLdrModel(containerDemoManifestParsed);
  const steps = useBuildGuideSteps(
    containerDemoManifestParsed,
    ldr.stepHandler,
  );

  const bundle = useMemo<BuildGuideBundle>(
    () => ({
      manifest: containerDemoManifestParsed,
      model: ldr.model,
      stepHandler: ldr.stepHandler,
      partsBuilder: ldr.partsBuilder,
      loading: !ldr.ready,
      progress: ldr.progress,
      error: ldr.error,
    }),
    [ldr],
  );

  React.useEffect(() => {
    const gpu = globalThis.navigator?.gpu;
    if (!gpu) {
      return;
    }

    void gpu.requestAdapter().then(adapter => {
      if (adapter) {
        warnIfNotHardwareAccelerated(adapter);
      }
    });
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.mainRow}>
        <View
          style={[
            styles.canvas,
            {
              paddingLeft: Math.max(insets.left, 0),
              paddingBottom: Math.max(insets.bottom, 0),
            },
          ]}
        >
          <BuildGuideRuntimeCanvas
            bundle={bundle}
            stepIndex={steps.currentIndex}
          />
        </View>

        <BuildGuideSidePanel
          modelNameKey={bundle.manifest.nameKey}
          currentIndex={steps.currentIndex}
          totalSteps={steps.totalSteps}
          progress={steps.progress}
          step={steps.currentStep}
          parts={ldr.partsBuilder?.parts ?? []}
          isLastStep={steps.isLastStep}
          canGoPrev={steps.canGoPrev}
          canGoNext={steps.canGoNext}
          onPrev={steps.goPrev}
          onNext={steps.goNext}
          onSelectStep={steps.goToStep}
          paddingRight={Math.max(insets.right, 12)}
        />
      </View>
    </View>
  );
}
