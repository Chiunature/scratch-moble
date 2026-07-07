import React from 'react';
import { Pressable, View } from 'react-native';
import { useTranslation } from '@scratch-mobile/i18n';

import { ChevronLeftIcon, ChevronRightIcon } from './icons/BuildGuideIcons';
import { styles } from './BuildGuideBottomBar.styles';

type BuildGuideBottomBarProps = {
  canGoPrev: boolean;
  canGoNext: boolean;
  isLastStep: boolean;
  paddingBottom: number;
  paddingLeft: number;
  paddingRight: number;
  onPrev: () => void;
  onNext: () => void;
};

export function BuildGuideBottomBar({
  canGoPrev,
  canGoNext,
  isLastStep,
  paddingBottom,
  paddingLeft,
  paddingRight,
  onPrev,
  onNext,
}: BuildGuideBottomBarProps) {
  const { t } = useTranslation('buildGuide');
  const canPressNext = canGoNext || isLastStep;

  return (
    <View
      pointerEvents="box-none"
      style={[
        styles.container,
        {
          paddingBottom: Math.max(paddingBottom, 16),
          paddingLeft: Math.max(paddingLeft, 20),
          paddingRight: Math.max(paddingRight, 20),
        },
      ]}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('prevStep')}
        accessibilityState={{ disabled: !canGoPrev }}
        disabled={!canGoPrev}
        hitSlop={12}
        onPress={onPrev}
        style={({ pressed }) => [
          styles.iconButton,
          !canGoPrev && styles.iconDisabled,
          pressed && canGoPrev && styles.iconPressed,
        ]}
      >
        <ChevronLeftIcon
          size={28}
          color={canGoPrev ? '#4f46e5' : '#94a3b8'}
        />
      </Pressable>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={isLastStep ? t('complete') : t('nextStep')}
        accessibilityState={{ disabled: !canPressNext }}
        disabled={!canPressNext}
        hitSlop={12}
        onPress={onNext}
        style={({ pressed }) => [
          styles.iconButton,
          !canPressNext && styles.iconDisabled,
          pressed && canPressNext && styles.iconPressed,
        ]}
      >
        <ChevronRightIcon
          size={28}
          color={canPressNext ? '#4f46e5' : '#94a3b8'}
        />
      </Pressable>
    </View>
  );
}
