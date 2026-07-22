import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { useTranslation } from '@scratch-mobile/i18n';

import {
  ChevronLeftIcon,
  ListIcon,
  SettingsIcon,
} from './icons/BuildGuideIcons';
import { styles } from './BuildGuideTopBar.styles';

type BuildGuideTopBarProps = {
  modelNameKey: string;
  currentIndex: number;
  totalSteps: number;
  progress: number;
  paddingTop: number;
  paddingLeft: number;
  paddingRight: number;
  onBack: () => void;
  onOpenStepPicker: () => void;
  onOpenParts: () => void;
  onOpenSettings: () => void;
};

export function BuildGuideTopBar({
  modelNameKey,
  currentIndex,
  totalSteps,
  progress,
  paddingTop,
  paddingLeft,
  paddingRight,
  onBack,
  onOpenStepPicker,
  onOpenParts,
  onOpenSettings,
}: BuildGuideTopBarProps) {
  const { t } = useTranslation('buildGuide');
  const { t: tCommon } = useTranslation('common');

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
          accessibilityLabel={t('jumpToStep')}
          onPress={onOpenStepPicker}
          style={({ pressed }) => [
            styles.stepCounterButton,
            pressed && styles.stepCounterButtonPressed,
          ]}
        >
          <Text style={styles.stepCounter}>
            {t('stepCounter', { current: currentIndex + 1, total: totalSteps })}
          </Text>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('openPartsList')}
          onPress={onOpenParts}
          style={({ pressed }) => [
            styles.iconButton,
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
      </View>

      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { flex: progress }]} />
        <View style={{ flex: 1 - progress }} />
      </View>
    </View>
  );
}
