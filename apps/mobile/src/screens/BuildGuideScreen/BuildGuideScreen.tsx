import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';
import { type NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { type RootStackParamList } from '../../app/navigation';
import '../../features/buildGuide/runtime/setupThreeRuntime';
import {
  BuildGuideBottomBar,
  BuildGuidePliSidePanel,
  BuildGuideRuntimeCanvas,
  BuildGuideSettingsModal,
  BuildGuideTopBar,
} from '../../features/buildGuide/components';
import {
  getBuildGuideManifest,
  isBuildGuideModelId,
} from '../../features/buildGuide/data/bundles';
import { useBuildGuideSteps } from '../../features/buildGuide/hooks/useBuildGuideSteps';
import { useLdrModel } from '../../features/buildGuide/hooks/useLdrModel';
import { useBuildGuideSettings } from '../../features/buildGuide/settings';
import type { BuildGuideBundle } from '../../features/buildGuide/types';
import { styles } from './BuildGuideScreen.styles';

type Props = NativeStackScreenProps<RootStackParamList, 'BuildGuidePlayer'>;

const FALLBACK_BUILD_GUIDE_MODEL_ID = 'container-demo'; 

export function BuildGuideScreen({ navigation, route }: Props) {
  const insets = useSafeAreaInsets();
  const requestedModelId = route.params?.modelId;
  const hasValidModelId =
    typeof requestedModelId === 'string' &&
    isBuildGuideModelId(requestedModelId);
  const modelId = hasValidModelId
    ? requestedModelId
    : FALLBACK_BUILD_GUIDE_MODEL_ID;
  const manifest = useMemo(
    () => getBuildGuideManifest(modelId),
    [modelId],
  );
  const [pliVisible, setPliVisible] = useState(true);
  const [settingsVisible, setSettingsVisible] = useState(false);
  const {
    settings,
    ready: settingsReady,
    updateSetting,
    appearanceRevision,
    geometryRevision,
  } = useBuildGuideSettings();

  useEffect(() => {
    if (!hasValidModelId) {
      navigation.replace('BuildGuide');
    }
  }, [hasValidModelId, navigation]);

  // 等设置 sync 到 LDR.Options 后再加载，避免 stud 选项闪默认值再重载
  const ldr = useLdrModel(settingsReady ? manifest : null);
  const reloadLdrModel = ldr.reload;
  const steps = useBuildGuideSteps(manifest, ldr.stepHandler);

  const bundle = useMemo<BuildGuideBundle>(
    () => ({
      manifest,
      model: ldr.model,
      stepHandler: ldr.stepHandler,
      partsBuilder: ldr.partsBuilder,
      loading: !settingsReady || !ldr.ready,
      progress: ldr.progress,
      error: ldr.error,
    }),
    [ldr, manifest, settingsReady],
  );

  useEffect(() => {
    if (geometryRevision === 0) {
      return;
    }
    reloadLdrModel();
  }, [geometryRevision, reloadLdrModel]);

  const handleBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const togglePliVisible = useCallback(() => {
    setPliVisible(visible => !visible);
  }, []);

  const handleOpenSettings = useCallback(() => {
    setSettingsVisible(true);
  }, []);

  const handleCloseSettings = useCallback(() => {
    setSettingsVisible(false);
  }, []);

  return (
    <View style={styles.container}>
      <BuildGuideTopBar
        modelNameKey={bundle.manifest.nameKey}
        currentIndex={steps.currentIndex}
        totalSteps={steps.totalSteps}
        paddingTop={insets.top}
        paddingLeft={insets.left}
        paddingRight={insets.right}
        pliVisible={pliVisible}
        onBack={handleBack}
        onSelectStep={steps.goToStep}
        onTogglePli={togglePliVisible}
        onOpenSettings={handleOpenSettings}
      />

      <View style={styles.stage}>
        {pliVisible ? (
          <BuildGuidePliSidePanel
            model={ldr.model}
            stepIndex={steps.currentIndex}
            paddingLeft={insets.left}
          />
        ) : null}
        <View style={styles.canvas}>
          <BuildGuideRuntimeCanvas
            bundle={bundle}
            stepIndex={steps.currentIndex}
            animationMode={settings.showStepRotationAnimations}
            appearanceRevision={appearanceRevision}
          />
        </View>
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

      {settingsVisible ? (
        <BuildGuideSettingsModal
          visible={settingsVisible}
          settings={settings}
          onClose={handleCloseSettings}
          onChange={updateSetting}
        />
      ) : null}
    </View>
  );
}
