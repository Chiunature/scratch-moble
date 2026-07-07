import React from 'react';
import { Text, View } from 'react-native';
import { useTranslation } from '@scratch-mobile/i18n';

import type { BuildGuideStep } from '../types';
import { styles } from './BuildGuideStepHeader.styles';

type BuildGuideStepHeaderProps = {
  modelNameKey: string;
  currentIndex: number;
  totalSteps: number;
  progress: number;
  step: BuildGuideStep;
};

export function BuildGuideStepHeader({
  modelNameKey,
  currentIndex,
  totalSteps,
  progress,
  step,
}: BuildGuideStepHeaderProps) {
  const { t } = useTranslation('buildGuide');

  return (
    <View style={styles.container}>
      <View style={styles.topRow}>
        <Text style={styles.modelName} numberOfLines={1}>
          {t(modelNameKey)}
        </Text>
        <Text style={styles.stepCounter}>
          {t('stepCounter', { current: currentIndex + 1, total: totalSteps })}
        </Text>
      </View>
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { flex: progress }]} />
        <View style={{ flex: 1 - progress }} />
      </View>
      <Text style={styles.stepTitle}>
        {t(step.titleKey, { step: currentIndex + 1 })}
      </Text>
      <Text style={styles.stepDescription}>
        {t(step.descriptionKey, { step: currentIndex + 1 })}
      </Text>
    </View>
  );
}
