import React from 'react';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from '@scratch-mobile/i18n';

import type { BuildGuideSettings } from '../settings';
import { styles } from './BuildGuideSettingsModal.styles';
import {
  HighlightLimePreview,
  HighlightNormalPreview,
  HighlightOldMonoPreview,
  HighlightRedPreview,
  LineContrastHighPreview,
  LineContrastLdrawPreview,
  SettingsOptionChip,
  AnimNormalPreview,
  AnimOffPreview,
  AnimSlowPreview,
  StudHollowPreview,
  StudLogoPreview,
  StudPlainPreview,
  StudSolidPreview,
} from './BuildGuideSettingsPreviews';

type BuildGuideSettingsModalProps = {
  visible: boolean;
  settings: BuildGuideSettings;
  onClose: () => void;
  onChange: <K extends keyof BuildGuideSettings>(
    key: K,
    value: BuildGuideSettings[K],
  ) => void;
};

export function BuildGuideSettingsModal({
  visible,
  settings,
  onClose,
  onChange,
}: BuildGuideSettingsModalProps) {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation('buildGuide');

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      presentationStyle="overFullScreen"
      statusBarTranslucent
      navigationBarTranslucent
      onRequestClose={onClose}
    >
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable
          style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 16) }]}
          onPress={event => event.stopPropagation()}
        >
          <View style={styles.header}>
            <Text style={styles.title}>{t('settingsTitle')}</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('closeSettings')}
              onPress={onClose}
            >
              <Text style={styles.closeButton}>{t('closeSettings')}</Text>
            </Pressable>
          </View>

          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{t('settingsLineContrast')}</Text>
              <Text style={styles.sectionHint}>
                {t('settingsLineContrastHint')}
              </Text>
              <View style={styles.optionRow}>
                <SettingsOptionChip
                  selected={settings.lineContrast === 0}
                  label={t('lineContrastHigh')}
                  onPress={() => onChange('lineContrast', 0)}
                >
                  <LineContrastHighPreview selected={settings.lineContrast === 0} />
                </SettingsOptionChip>
                <SettingsOptionChip
                  selected={settings.lineContrast === 1}
                  label={t('lineContrastLdraw')}
                  onPress={() => onChange('lineContrast', 1)}
                >
                  <LineContrastLdrawPreview selected={settings.lineContrast === 1} />
                </SettingsOptionChip>
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{t('settingsStudContrast')}</Text>
              <Text style={styles.sectionHint}>
                {t('settingsStudContrastHint')}
              </Text>
              <View style={styles.optionRow}>
                <SettingsOptionChip
                  selected={settings.studHighContrast === 1}
                  label={t('studContrastOn')}
                  onPress={() => onChange('studHighContrast', 1)}
                >
                  <StudSolidPreview selected={settings.studHighContrast === 1} />
                </SettingsOptionChip>
                <SettingsOptionChip
                  selected={settings.studHighContrast === 0}
                  label={t('studContrastOff')}
                  onPress={() => onChange('studHighContrast', 0)}
                >
                  <StudHollowPreview selected={settings.studHighContrast === 0} />
                </SettingsOptionChip>
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{t('settingsStudLogo')}</Text>
              <Text style={styles.sectionHint}>{t('settingsStudLogoHint')}</Text>
              <View style={styles.optionRow}>
                <SettingsOptionChip
                  selected={settings.studLogo === 0}
                  label={t('studLogoOff')}
                  onPress={() => onChange('studLogo', 0)}
                >
                  <StudPlainPreview selected={settings.studLogo === 0} />
                </SettingsOptionChip>
                <SettingsOptionChip
                  selected={settings.studLogo === 1}
                  label={t('studLogoOn')}
                  onPress={() => onChange('studLogo', 1)}
                >
                  <StudLogoPreview selected={settings.studLogo === 1} />
                </SettingsOptionChip>
              </View>
              <Text style={styles.studReloadNote}>{t('studReloadNote')}</Text>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{t('settingsHighlight')}</Text>
              <Text style={styles.sectionHint}>{t('settingsHighlightHint')}</Text>
              <View style={styles.optionRow}>
                <SettingsOptionChip
                  selected={settings.showOldColors === 0}
                  label={t('highlightRed')}
                  onPress={() => onChange('showOldColors', 0)}
                >
                  <HighlightRedPreview selected={settings.showOldColors === 0} />
                </SettingsOptionChip>
                <SettingsOptionChip
                  selected={settings.showOldColors === 1}
                  label={t('highlightLime')}
                  onPress={() => onChange('showOldColors', 1)}
                >
                  <HighlightLimePreview selected={settings.showOldColors === 1} />
                </SettingsOptionChip>
                <SettingsOptionChip
                  selected={settings.showOldColors === 2}
                  label={t('highlightNormal')}
                  onPress={() => onChange('showOldColors', 2)}
                >
                  <HighlightNormalPreview selected={settings.showOldColors === 2} />
                </SettingsOptionChip>
                <SettingsOptionChip
                  selected={settings.showOldColors === 3}
                  label={t('highlightOldMono')}
                  onPress={() => onChange('showOldColors', 3)}
                >
                  <HighlightOldMonoPreview selected={settings.showOldColors === 3} />
                </SettingsOptionChip>
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{t('settingsAnimation')}</Text>
              <Text style={styles.sectionHint}>{t('settingsAnimationHint')}</Text>
              <View style={styles.optionRow}>
                <SettingsOptionChip
                  selected={settings.showStepRotationAnimations === 0}
                  label={t('animationSlow')}
                  onPress={() => onChange('showStepRotationAnimations', 0)}
                >
                  <AnimSlowPreview
                    selected={settings.showStepRotationAnimations === 0}
                  />
                </SettingsOptionChip>
                <SettingsOptionChip
                  selected={settings.showStepRotationAnimations === 1}
                  label={t('animationNormal')}
                  onPress={() => onChange('showStepRotationAnimations', 1)}
                >
                  <AnimNormalPreview
                    selected={settings.showStepRotationAnimations === 1}
                  />
                </SettingsOptionChip>
                <SettingsOptionChip
                  selected={settings.showStepRotationAnimations === 2}
                  label={t('animationOff')}
                  onPress={() => onChange('showStepRotationAnimations', 2)}
                >
                  <AnimOffPreview
                    selected={settings.showStepRotationAnimations === 2}
                  />
                </SettingsOptionChip>
              </View>
            </View>

          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
