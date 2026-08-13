import React, { useCallback } from 'react';
import { Image, Pressable, ScrollView, Text, View } from 'react-native';
import { type NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  APP_LOCALES,
  LOCALE_LABEL_KEY,
  type AppLocale,
  getCurrentAppLocale,
  useTranslation,
} from '@scratch-mobile/i18n';
import { APP_VERSION, HARDWARE_VERSION } from '../../constants/appVersion';

import { type RootStackParamList } from '../../app/navigation';
import { saveAppLocale } from '../../services/i18n/localeStorage';
import { styles } from './SettingsScreen.styles';
import backIcon from '../../../assets/settingScreen/back.png';
type Props = NativeStackScreenProps<RootStackParamList, 'Settings'>;

function LanguageOption({
  locale,
  selected,
  label,
  onSelect,
}: {
  locale: AppLocale;
  selected: boolean;
  label: string;
  onSelect: (locale: AppLocale) => void;
}) {
  return (
    <Pressable
      style={styles.languageOption}
      onPress={() => onSelect(locale)}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
    >
      <View style={[styles.checkbox, selected && styles.checkboxSelected]}>
        {selected ? <Text style={styles.checkboxMark}>✓</Text> : null}
      </View>
      <Text
        style={[styles.languageLabel, selected && styles.languageLabelSelected]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export function SettingsScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation('settings');
  const { t: tCommon } = useTranslation('common');
  const currentLocale = getCurrentAppLocale();

  const handleSelectLocale = useCallback(async (locale: AppLocale) => {
    if (locale === getCurrentAppLocale()) {
      return;
    }
    await saveAppLocale(locale);
  }, []);

  return (
    <View
      style={[
        styles.container,
        { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 16 },
      ]}
    >
      <View style={styles.header}>
        <Pressable
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          accessibilityRole="button"
          accessibilityLabel={tCommon('back')}
        >
          <Image source={backIcon} style={styles.backIcon} />
        </Pressable>
        <Text style={styles.headerTitle}>{t('title')}</Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.panel}>
          <View style={[styles.section, styles.sectionFirst]}>
            <Text style={styles.sectionLabel}>{t('languageSection')}</Text>
            <View style={[styles.sectionContent, styles.languageRow]}>
              {APP_LOCALES.map(locale => (
                <LanguageOption
                  key={locale}
                  locale={locale}
                  selected={currentLocale === locale}
                  label={t(LOCALE_LABEL_KEY[locale])}
                  onSelect={handleSelectLocale}
                />
              ))}
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionLabel}>{t('versionSection')}</Text>
            <View style={styles.sectionContent}>
              <Text style={styles.versionText}>
                {t('versionLabel', { version: APP_VERSION })}
              </Text>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionLabel}>{t('hardwareVersion')}</Text>
            <View style={styles.sectionContent}>
              <Text style={styles.versionText}>
                {t('versionLabel', { version: HARDWARE_VERSION })}
              </Text>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionLabel}>{t('infoSection')}</Text>
            <View style={styles.sectionContent}>
              <Text style={styles.infoText}>{t('infoBody')}</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
