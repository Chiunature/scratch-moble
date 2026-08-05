import React, { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useTranslation } from '@scratch-mobile/i18n';

import {
  ChevronLeftIcon,
  ListIcon,
  SettingsIcon,
} from './icons/BuildGuideIcons';
import { StepSlider } from './StepSlider';
import { styles } from './BuildGuideTopBar.styles';

type BuildGuideTopBarProps = {
  modelNameKey: string;
  currentIndex: number;
  totalSteps: number;
  paddingTop: number;
  paddingLeft: number;
  paddingRight: number;
  pliVisible: boolean;
  onBack: () => void;
  onSelectStep: (index: number) => void;
  onTogglePli: () => void;
  onOpenSettings: () => void;
};

export function BuildGuideTopBar({
  modelNameKey,
  currentIndex,
  totalSteps,
  paddingTop,
  paddingLeft,
  paddingRight,
  pliVisible,
  onBack,
  onSelectStep,
  onTogglePli,
  onOpenSettings,
}: BuildGuideTopBarProps) {
  const { t } = useTranslation('buildGuide');
  const { t: tCommon } = useTranslation('common');
  // 拖动中实时跟随手指，松手后由 currentIndex 兜底同步
  const [displayIndex, setDisplayIndex] = useState(currentIndex);

  useEffect(() => {
    setDisplayIndex(currentIndex);
  }, [currentIndex]);

  return (
    <View
      style={[
        styles.container,
        {
          paddingTop: paddingTop + 8,
          paddingLeft: Math.max(paddingLeft, 12),
          paddingRight: Math.max(paddingRight, 12),
        },
      ]}
    >
      <View style={styles.row}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={tCommon('back')}
          hitSlop={8}
          onPress={onBack}
          style={({ pressed }) => [
            styles.backButton,
            pressed && styles.backButtonPressed,
          ]}
        >
          <ChevronLeftIcon size={22} color="#111827" />
        </Pressable>

        <Text style={styles.modelName} numberOfLines={1}>
          {t(modelNameKey)}
        </Text>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={
            pliVisible ? t('hidePliPanel') : t('showPliPanel')
          }
          onPress={onTogglePli}
          style={({ pressed }) => [
            styles.iconButton,
            pliVisible && styles.iconButtonActive,
            pressed && styles.iconButtonPressed,
          ]}
        >
          <ListIcon size={20} color="#4f46e5" />
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('openSettings')}
          onPress={onOpenSettings}
          style={({ pressed }) => [
            styles.iconButton,
            pressed && styles.iconButtonPressed,
          ]}
        >
          <SettingsIcon size={20} color="#4f46e5" />
        </Pressable>

        <Text style={styles.ratioText}>
          {displayIndex + 1} / {Math.max(totalSteps, 1)}
        </Text>
      </View>

      <StepSlider
        currentIndex={currentIndex}
        totalSteps={totalSteps}
        onSelectStep={onSelectStep}
        onDisplayIndexChange={setDisplayIndex}
        accessibilityLabel={t('stepCounter', {
          current: currentIndex + 1,
          total: totalSteps,
        })}
      />
    </View>
  );
}
