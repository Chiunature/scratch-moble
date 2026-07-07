import React, { useState } from 'react';
import { View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { warnIfNotHardwareAccelerated } from 'react-native-webgpu';

import {
  BuildGuideBottomBar,
  BuildGuidePartsModal,
  BuildGuideRuntimeCanvas,
  BuildGuideStepPickerModal,
  BuildGuideTopBar,
} from '../../features/buildGuide/components';
import { containerDemoManifestParsed } from '../../features/buildGuide/data/bundles';
import { useBuildGuideSteps } from '../../features/buildGuide/hooks/useBuildGuideSteps';
import { useLdrModel } from '../../features/buildGuide/hooks/useLdrModel';
import type { BuildGuideBundle } from '../../features/buildGuide/types';
import { styles } from './BuildGuideScreen.styles';

export function BuildGuideScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const [partsModalVisible, setPartsModalVisible] = useState(false);
  const [stepPickerVisible, setStepPickerVisible] = useState(false);
  const ldr = useLdrModel(containerDemoManifestParsed);
  const steps = useBuildGuideSteps(
    containerDemoManifestParsed,
    ldr.stepHandler,
  );

  const bundle = React.useMemo<BuildGuideBundle>(
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
      <BuildGuideTopBar
        modelNameKey={bundle.manifest.nameKey}
        currentIndex={steps.currentIndex}
        totalSteps={steps.totalSteps}
        progress={steps.progress}
        paddingTop={insets.top}
        paddingLeft={insets.left}
        paddingRight={insets.right}
        onBack={() => navigation.goBack()}
        onOpenStepPicker={() => setStepPickerVisible(true)}
        onOpenParts={() => setPartsModalVisible(true)}
      />

      <View style={styles.canvas}>
        <BuildGuideRuntimeCanvas bundle={bundle} stepIndex={steps.currentIndex} />
      </View>

      <BuildGuideBottomBar
        canGoPrev={steps.canGoPrev}
        canGoNext={steps.canGoNext}
        isLastStep={steps.isLastStep}
        paddingBottom={insets.bottom}
        paddingLeft={insets.left}
        paddingRight={insets.right}
        onPrev={steps.goPrev}
        onNext={steps.goNext}
      />

      <BuildGuidePartsModal
        visible={partsModalVisible}
        parts={ldr.partsBuilder?.parts ?? []}
        onClose={() => setPartsModalVisible(false)}
      />

      <BuildGuideStepPickerModal
        visible={stepPickerVisible}
        currentIndex={steps.currentIndex}
        totalSteps={steps.totalSteps}
        onSelectStep={steps.goToStep}
        onClose={() => setStepPickerVisible(false)}
      />
    </View>
  );
}
