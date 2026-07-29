import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Text,
  useWindowDimensions,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useTranslation } from '@scratch-mobile/i18n';

import type { LoadedLdrModel } from '@scratch-mobile/ldr-engine';

import { colors, spacing } from '../../../../theme';
import type { BuildGuidePliItemViewModel } from '../data/buildPliViewModels';
import { PLI_THUMBNAIL_HEIGHT } from '../layout/measurePliItem';
import {
  packPliItems,
  type BuildGuidePliLayoutItem,
} from '../layout/packPliItems';
import { BuildGuidePliExpoGlLayer } from '../renderers/BuildGuidePliExpoGlLayer';
import type { PliThumbnailRequest } from '../renderers/types';
import { styles } from './BuildGuidePliPanel.styles';

type BuildGuidePliPanelProps = {
  items: ReadonlyArray<BuildGuidePliItemViewModel>;
  model?: LoadedLdrModel | null;
  showLabel?: boolean;
  /** 侧栏等固定宽度场景传入；未传则按窗口宽度计算 */
  containerWidth?: number;
};

function cardFrameStyle(item: BuildGuidePliLayoutItem): ViewStyle {
  return {
    height: item.height,
    left: item.x,
    top: item.y,
    width: item.width,
  };
}

function PliCardSurface({
  item,
  hideSwatch,
}: {
  item: BuildGuidePliLayoutItem;
  hideSwatch: boolean;
}) {
  return (
    <View style={[styles.cardSurface, cardFrameStyle(item)]}>
      <View style={styles.thumbnailSlot}>
        <View
          style={[
            styles.partSwatch,
            hideSwatch ? styles.hiddenSwatch : null,
            { backgroundColor: item.colorHex },
          ]}
        />
      </View>
    </View>
  );
}

function PliCardContent({ item }: { item: BuildGuidePliLayoutItem }) {
  return (
    <View style={[styles.cardContent, cardFrameStyle(item)]}>
      <View style={styles.thumbnailSlot}>
        <Text style={styles.quantity}>{item.quantityText}</Text>
      </View>
      <Text numberOfLines={2} style={styles.title}>
        {item.title}
      </Text>
      {item.subtitle ? (
        <Text numberOfLines={2} style={styles.subtitle}>
          {item.subtitle}
        </Text>
      ) : null}
      {item.annotation ? (
        <Text numberOfLines={1} style={styles.annotation}>
          {item.annotation}
        </Text>
      ) : null}
    </View>
  );
}

export function BuildGuidePliPanel({
  items,
  model,
  showLabel = true,
  containerWidth,
}: BuildGuidePliPanelProps) {
  const { t } = useTranslation('buildGuide');
  const { width: windowWidth } = useWindowDimensions();
  const resolvedWidth = Math.max(
    containerWidth ?? windowWidth - spacing.lg * 2,
    120,
  );
  const layout = useMemo(
    () =>
      packPliItems(items, {
        containerWidth: resolvedWidth,
        gap: spacing.sm,
        minItemWidth: Math.min(136, resolvedWidth),
      }),
    [items, resolvedWidth],
  );
  const thumbnails = useMemo<ReadonlyArray<PliThumbnailRequest>>(
    () =>
      layout.items.map(item => ({
        key: item.key,
        partID: item.partID,
        colorID: item.colorID,
        viewport: {
          x: item.x + spacing.sm,
          y: item.y + spacing.sm,
          width: Math.max(1, item.width - spacing.sm * 2),
          height: PLI_THUMBNAIL_HEIGHT,
        },
      })),
    [layout.items],
  );
  const hasModel = model != null;
  const [thumbnailRendererUnavailable, setThumbnailRendererUnavailable] =
    useState(false);
  const shouldRenderThumbnails = hasModel && !thumbnailRendererUnavailable;
  // 用布局签名同步判断就绪，避免 useEffect 晚一拍导致闪一下
  const thumbnailsKey = useMemo(
    () =>
      `${layout.contentWidth}x${layout.contentHeight}:${thumbnails
        .map(item => item.key)
        .join('|')}`,
    [layout.contentHeight, layout.contentWidth, thumbnails],
  );
  const [readyKey, setReadyKey] = useState<string | null>(null);
  const showLoading = shouldRenderThumbnails && readyKey !== thumbnailsKey;

  const handleThumbnailUnavailable = useCallback(() => {
    setThumbnailRendererUnavailable(true);
    setReadyKey(thumbnailsKey);
  }, [thumbnailsKey]);

  const handleThumbnailsReady = useCallback(() => {
    setReadyKey(thumbnailsKey);
  }, [thumbnailsKey]);

  useEffect(() => {
    setThumbnailRendererUnavailable(false);
  }, [hasModel, thumbnailsKey]);

  if (layout.items.length === 0) {
    return null;
  }

  const gridStyle: StyleProp<ViewStyle> = [
    styles.grid,
    {
      height: layout.contentHeight,
      width: layout.contentWidth,
      opacity: showLoading ? 0 : 1,
    },
  ];

  return (
    <View style={styles.container}>
      {showLabel ? <Text style={styles.label}>{t('partsThisStep')}</Text> : null}
      <View style={styles.stage}>
        <View
          style={gridStyle}
          // 隐藏时仍参与布局，避免 loading 结束高度跳动
          pointerEvents={showLoading ? 'none' : 'auto'}
        >
          {/* 底层：卡片背景与色块占位（GL 不可用时露出色块） */}
          {layout.items.map(item => (
            <PliCardSurface
              key={`${item.key}:surface`}
              item={item}
              hideSwatch={shouldRenderThumbnails}
            />
          ))}
          {/* 中层：整块 GL 画布，按 viewport 在各卡片缩略图槽位绘制 3D 零件 */}
          {shouldRenderThumbnails ? (
            <BuildGuidePliExpoGlLayer
              layoutSize={{
                height: layout.contentHeight,
                width: layout.contentWidth,
              }}
              model={model}
              thumbnails={thumbnails}
              onUnavailable={handleThumbnailUnavailable}
              onReady={handleThumbnailsReady}
            />
          ) : null}
          {/* 顶层：数量角标与标题等文字，盖在 GL 之上 */}
          {layout.items.map(item => (
            <PliCardContent key={item.key} item={item} />
          ))}
        </View>
        {showLoading ? (
          <View
            accessibilityLabel={t('pliLoading')}
            style={[
              styles.loadingOverlay,
              { minHeight: Math.max(layout.contentHeight, 120) },
            ]}
          >
            <ActivityIndicator color={colors.primary} size="small" />
            <Text style={styles.loadingText}>{t('pliLoading')}</Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}
