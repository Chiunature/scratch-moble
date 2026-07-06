import React, { useEffect } from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { warnIfNotHardwareAccelerated } from 'react-native-webgpu';

import { BuildGuideSidePanel } from '../../features/buildGuide/components';
import { demoDuckManifest } from '../../features/buildGuide/data/demoDuckManifest';
import { useBuildGuideSteps } from '../../features/buildGuide/hooks/useBuildGuideSteps';
import { BuildGuideWebGpuCanvas } from '../../features/buildGuide/webgpu/BuildGuideWebGpuCanvas';
import { styles } from './BuildGuideScreen.styles';

export function BuildGuideScreen() {
  const insets = useSafeAreaInsets();
  const steps = useBuildGuideSteps(demoDuckManifest);

  useEffect(() => {
    void navigator.gpu.requestAdapter().then(adapter => {
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
          <BuildGuideWebGpuCanvas stepIndex={steps.currentIndex} />
        </View>

        <BuildGuideSidePanel
          modelNameKey={demoDuckManifest.nameKey}
          currentIndex={steps.currentIndex}
          totalSteps={steps.totalSteps}
          progress={steps.progress}
          step={steps.currentStep}
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
