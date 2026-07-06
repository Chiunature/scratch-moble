import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { useTranslation } from '@scratch-mobile/i18n';

import { shadows } from '../../../theme';
import { styles } from './BuildGuideStepControls.styles';

type BuildGuideStepControlsProps = {
  canGoPrev: boolean;
  canGoNext: boolean;
  isLastStep: boolean;
  onPrev: () => void;
  onNext: () => void;
};

export function BuildGuideStepControls({
  canGoPrev,
  canGoNext,
  isLastStep,
  onPrev,
  onNext,
}: BuildGuideStepControlsProps) {
  const { t } = useTranslation('buildGuide');

  return (
    <View style={styles.container}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled: !canGoPrev }}
        disabled={!canGoPrev}
        onPress={onPrev}
        style={({ pressed }) => [
          styles.button,
          styles.secondaryButton,
          !canGoPrev && styles.buttonDisabled,
          pressed && canGoPrev && styles.buttonPressed,
        ]}
      >
        <Text
          style={[
            styles.buttonText,
            styles.secondaryButtonText,
            !canGoPrev && styles.buttonTextDisabled,
          ]}
        >
          {t('prevStep')}
        </Text>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled: !canGoNext }}
        disabled={!canGoNext}
        onPress={onNext}
        style={({ pressed }) => [
          styles.button,
          isLastStep ? styles.completeButton : styles.primaryButton,
          !isLastStep && shadows.primarySm,
          !canGoNext && !isLastStep && styles.buttonDisabled,
          pressed && canGoNext && styles.buttonPressed,
        ]}
      >
        <Text
          style={[
            styles.buttonText,
            isLastStep ? styles.completeButtonText : styles.primaryButtonText,
            !canGoNext && !isLastStep && styles.buttonTextDisabled,
          ]}
        >
          {isLastStep ? t('complete') : t('nextStep')}
        </Text>
      </Pressable>
    </View>
  );
}
