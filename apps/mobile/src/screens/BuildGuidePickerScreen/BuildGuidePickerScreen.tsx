import React, { useCallback, useState } from 'react';
import {
  FlatList,
  Image,
  Pressable,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { type NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from '@scratch-mobile/i18n';

import { type RootStackParamList } from '../../app/navigation';
import {
  BUILD_GUIDE_CATALOG,
  getBuildGuideProjectId,
  getBuildGuideStarterWorkspace,
  type BuildGuideCatalogEntry,
} from '../../features/buildGuide/data/bundles';
import { notify } from '../../services/notifications';
import { useProjectStore } from '../../store/useProjectStore';
import { spacing } from '../../theme';
import {
  BUILD_GUIDE_COVER_SIZE,
  styles,
} from './BuildGuidePickerScreen.styles';

type Props = NativeStackScreenProps<RootStackParamList, 'BuildGuide'>;

const CARD_GAP = spacing.sm; // 卡片间距 12
const LIST_PADDING = spacing.md; // 列表左右基础 padding 16
const CARD_WIDTH = BUILD_GUIDE_COVER_SIZE;
const MIN_COLUMNS = 1;
const MAX_COLUMNS = 4;

function ListItemSeparator() {
  return <View style={styles.itemSeparator} />;
}

export function BuildGuidePickerScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { t } = useTranslation('buildGuide');
  const { t: tCommon } = useTranslation('common');

  const contentPaddingLeft = Math.max(insets.left, LIST_PADDING);
  const contentPaddingRight = Math.max(insets.right, LIST_PADDING);

  const availableWidth = Math.max(
    width - contentPaddingLeft - contentPaddingRight,
    0,
  );

  // 用固定卡片宽度反推列数，并限制在 1~4 列
  const columns = Math.max(
    MIN_COLUMNS,
    Math.min(
      MAX_COLUMNS,
      Math.floor((availableWidth + CARD_GAP) / (CARD_WIDTH + CARD_GAP)),
    ),
  );

  const ensureTrackedWithWorkspace = useProjectStore(
    state => state.ensureTrackedWithWorkspace,
  );
  const [openingModelId, setOpeningModelId] = useState<string | null>(null);

  const handleOpenProgram = useCallback(
    async (entry: BuildGuideCatalogEntry) => {
      if (openingModelId) {
        return;
      }
      setOpeningModelId(entry.id);
      try {
        // 每个模型对应一个固定 ID 的内置项目：已存在则复用，不再新建作品。
        const summary = await ensureTrackedWithWorkspace({
          id: getBuildGuideProjectId(entry.id),
          name: t(entry.nameKey),
          workspace: getBuildGuideStarterWorkspace(entry.id),
        });
        navigation.navigate('Editor', { projectId: summary.id });
      } catch {
        notify.error(t('openProgramFailedTitle'), t('openProgramFailedMessage'));
      } finally {
        setOpeningModelId(null);
      }
    },
    [ensureTrackedWithWorkspace, navigation, openingModelId, t],
  );

  const handleOpenGuide = useCallback(
    (entry: BuildGuideCatalogEntry) => {
      navigation.navigate('BuildGuidePlayer', { modelId: entry.id });
    },
    [navigation],
  );

  const renderItem = useCallback(
    ({ item }: { item: BuildGuideCatalogEntry }) => (
      <View style={[styles.card, styles.cardShadow]}>
        <Image
          source={item.cover}
          style={styles.cardCover}
          resizeMode="cover"
        />
        <Text style={styles.cardTitle} numberOfLines={2}>
          {t(item.nameKey)}
        </Text>
        <View style={styles.cardActions}>
          <Pressable
            style={({ pressed }) => [
              styles.actionButton,
              pressed && styles.cardPressed,
            ]}
            onPress={() => handleOpenProgram(item)}
            accessibilityRole="button"
            accessibilityLabel={t('openProgram')}
          >
            <Text style={styles.actionButtonText} numberOfLines={1}>
              {t('openProgram')}
            </Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [
              styles.actionButton,
              styles.actionButtonSecondary,
              pressed && styles.cardPressed,
            ]}
            onPress={() => handleOpenGuide(item)}
            accessibilityRole="button"
            accessibilityLabel={t('openGuide')}
          >
            <Text style={styles.actionButtonSecondaryText} numberOfLines={1}>
              {t('openGuide')}
            </Text>
          </Pressable>
        </View>
      </View>
    ),
    [handleOpenGuide, handleOpenProgram, t],
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
        key={columns}
        data={BUILD_GUIDE_CATALOG}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        numColumns={columns}
        columnWrapperStyle={columns > 1 ? styles.listRow : undefined}
        ItemSeparatorComponent={columns === 1 ? ListItemSeparator : undefined}
        contentContainerStyle={[
          styles.listContent,
          {
            paddingLeft: contentPaddingLeft,
            paddingRight: contentPaddingRight,
            paddingBottom: insets.bottom + spacing['3xl'],
          },
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
