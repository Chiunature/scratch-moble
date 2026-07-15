import React, { useCallback } from 'react';
import { FlatList, Image, Pressable, Text, View } from 'react-native';
import { type NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from '@scratch-mobile/i18n';

import { type RootStackParamList } from '../../app/navigation';
import {
  BUILD_GUIDE_CATALOG,
  type BuildGuideCatalogEntry,
} from '../../features/buildGuide/data/bundles';
import { spacing } from '../../theme';
import { styles } from './BuildGuidePickerScreen.styles';

type Props = NativeStackScreenProps<RootStackParamList, 'BuildGuide'>;

export function BuildGuidePickerScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation('buildGuide');
  const { t: tCommon } = useTranslation('common');

  const handleSelectModel = useCallback(
    (entry: BuildGuideCatalogEntry) => {
      navigation.navigate('BuildGuidePlayer', { modelId: entry.id });
    },
    [navigation],
  );

  const renderItem = useCallback(
    ({ item }: { item: BuildGuideCatalogEntry }) => (
      <Pressable
        style={({ pressed }) => [
          styles.card,
          styles.cardShadow,
          pressed && styles.cardPressed,
        ]}
        onPress={() => handleSelectModel(item)}
        accessibilityRole="button"
        accessibilityLabel={t(item.nameKey)}
      >
        <Image
          source={item.cover}
          style={styles.cardCover}
          resizeMode="contain"
        />
        <Text style={styles.cardTitle} numberOfLines={2}>
          {t(item.nameKey)}
        </Text>
        <Text style={styles.cardSubtitle}>{t('openGuide')}</Text>
      </Pressable>
    ),
    [handleSelectModel, t],
  );

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Pressable
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          accessibilityRole="button"
          accessibilityLabel={t('backToHome')}
        >
          <Text style={styles.backButtonText}>{tCommon('back')}</Text>
        </Pressable>
        <Text style={styles.title}>{t('selectModel')}</Text>
        <View style={styles.headerSpacer} />
      </View>

      <FlatList
        data={BUILD_GUIDE_CATALOG}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        numColumns={2}
        columnWrapperStyle={styles.listRow}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: insets.bottom + spacing['3xl'] },
        ]}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <Text style={styles.hint}>{t('selectModelHint')}</Text>
        }
        ListEmptyComponent={
          <Text style={styles.emptyHint}>{t('noModels')}</Text>
        }
      />
    </View>
  );
}
