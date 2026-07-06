import React from 'react';
import { ScrollView, Text, View } from 'react-native';
import { useTranslation } from '@scratch-mobile/i18n';

import type { BuildGuideStep } from '../types';
import { BuildGuidePartsPanel } from './BuildGuidePartsPanel';
import { BuildGuideStepControls } from './BuildGuideStepControls';
import { BuildGuideStepHeader } from './BuildGuideStepHeader';
import { BuildGuideStepStrip } from './BuildGuideStepStrip';
import { styles } from './BuildGuideSidePanel.styles';

type BuildGuideSidePanelProps = {
  modelNameKey: string;
  currentIndex: number;
  totalSteps: number;
  progress: number;
  step: BuildGuideStep;
  isLastStep: boolean;
  canGoPrev: boolean;
  canGoNext: boolean;
  onPrev: () => void;
  onNext: () => void;
  onSelectStep: (index: number) => void;
  paddingRight: number;
};

export function BuildGuideSidePanel({
  modelNameKey,
  currentIndex,
  totalSteps,
  progress,
  step,
  isLastStep,
  canGoPrev,
  canGoNext,
  onPrev,
  onNext,
  onSelectStep,
  paddingRight,
}: BuildGuideSidePanelProps) {
  const { t } = useTranslation('buildGuide');

  return (
    <View style={[styles.panel, { paddingRight }]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <BuildGuideStepHeader
          modelNameKey={modelNameKey}
          currentIndex={currentIndex}
          totalSteps={totalSteps}
          progress={progress}
          step={step}
        />
        <BuildGuidePartsPanel parts={step.parts} />
        <BuildGuideStepStrip
          currentIndex={currentIndex}
          totalSteps={totalSteps}
          onSelectStep={onSelectStep}
        />
      </ScrollView>

      <View style={styles.actions}>
        <BuildGuideStepControls
          canGoPrev={canGoPrev}
          canGoNext={canGoNext}
          isLastStep={isLastStep}
          onPrev={onPrev}
          onNext={onNext}
        />
        <Text style={styles.hintText}>
          {isLastStep ? t('reviewHint') : t('gestureHint')}
        </Text>
      </View>
    </View>
  );
}
