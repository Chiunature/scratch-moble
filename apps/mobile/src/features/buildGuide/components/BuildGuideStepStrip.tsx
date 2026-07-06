import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { useTranslation } from '@scratch-mobile/i18n';

import { styles } from './BuildGuideStepStrip.styles';

type BuildGuideStepStripProps = {
  currentIndex: number;
  totalSteps: number;
  onSelectStep: (index: number) => void;
};

export function BuildGuideStepStrip({
  currentIndex,
  totalSteps,
  onSelectStep,
}: BuildGuideStepStripProps) {
  const { t } = useTranslation('buildGuide');

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{t('jumpToStep')}</Text>
      <View style={styles.strip}>
        {Array.from({ length: totalSteps }, (_, index) => {
          const isActive = index === currentIndex;
          const isComplete = index < currentIndex;

          return (
            <Pressable
              key={index}
              accessibilityRole="button"
              accessibilityLabel={t('stepButtonLabel', { step: index + 1 })}
              accessibilityState={{ selected: isActive }}
              onPress={() => onSelectStep(index)}
              style={({ pressed }) => [
                styles.stepButton,
                isComplete && styles.stepButtonComplete,
                isActive && styles.stepButtonActive,
                pressed && styles.stepButtonPressed,
              ]}
            >
              <Text
                style={[
                  styles.stepButtonText,
                  isComplete && styles.stepButtonTextComplete,
                  isActive && styles.stepButtonTextActive,
                ]}
              >
                {index + 1}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
