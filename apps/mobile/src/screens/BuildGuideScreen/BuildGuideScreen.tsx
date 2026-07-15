import React, { useCallback, useMemo, useState } from 'react';
import { View } from 'react-native';
import { type NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { warnIfNotHardwareAccelerated } from 'react-native-webgpu';

import { type RootStackParamList } from '../../app/navigation';
import {
  BuildGuideBottomBar,
  BuildGuidePartsModal,
  BuildGuideRuntimeCanvas,
  BuildGuideStepPickerModal,
  BuildGuideTopBar,
} from '../../features/buildGuide/components';
import { getBuildGuideManifest } from '../../features/buildGuide/data/bundles';
import { useBuildGuideSteps } from '../../features/buildGuide/hooks/useBuildGuideSteps';
import { useLdrModel } from '../../features/buildGuide/hooks/useLdrModel';
import type { BuildGuideBundle } from '../../features/buildGuide/types';
import '../../features/buildGuide/webgpu/setupThreeWebGpu';
import { styles } from './BuildGuideScreen.styles';

type Props = NativeStackScreenProps<RootStackParamList, 'BuildGuidePlayer'>;

export function BuildGuideScreen({ navigation, route }: Props) {
  const insets = useSafeAreaInsets();
  const manifest = useMemo(
    () => getBuildGuideManifest(route.params.modelId),
    [route.params.modelId],
  );
  const [partsModalVisible, setPartsModalVisible] = useState(false);
  const [stepPickerVisible, setStepPickerVisible] = useState(false);
  const ldr = useLdrModel(manifest);
  const steps = useBuildGuideSteps(manifest, ldr.stepHandler);

  const bundle = useMemo<BuildGuideBundle>(
    () => ({
      manifest,
      model: ldr.model,
      stepHandler: ldr.stepHandler,
      partsBuilder: ldr.partsBuilder,
      loading: !ldr.ready,
      progress: ldr.progress,
      error: ldr.error,
    }),
    [ldr, manifest],
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

  const handleBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

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
        onBack={handleBack}
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
