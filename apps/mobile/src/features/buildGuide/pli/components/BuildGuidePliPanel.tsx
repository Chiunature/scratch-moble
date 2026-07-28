import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Text, useWindowDimensions, View } from 'react-native';
import { useTranslation } from '@scratch-mobile/i18n';

import type { LoadedLdrModel } from '@scratch-mobile/ldr-engine';

import { spacing } from '../../../../theme';
import type { BuildGuidePliItemViewModel } from '../data/buildPliViewModels';
import { PLI_THUMBNAIL_HEIGHT } from '../layout/measurePliItem';
import { packPliItems } from '../layout/packPliItems';
import { BuildGuidePliExpoGlLayer } from '../renderers/BuildGuidePliExpoGlLayer';
import type { PliThumbnailRequest } from '../renderers/types';
import { styles } from './BuildGuidePliPanel.styles';

type BuildGuidePliPanelProps = {
  items: ReadonlyArray<BuildGuidePliItemViewModel>;
  model?: LoadedLdrModel | null;
  showLabel?: boolean;
};

export function BuildGuidePliPanel({
  items,
  model,
  showLabel = true,
}: BuildGuidePliPanelProps) {
  const { t } = useTranslation('buildGuide');
  const { width } = useWindowDimensions();
  const layout = useMemo(
    () =>
      packPliItems(items, {
        containerWidth: Math.max(width - spacing.lg * 2, 260),
        gap: spacing.sm,
      }),
    [items, width],
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
  const handleThumbnailUnavailable = useCallback(() => {
    setThumbnailRendererUnavailable(true);
  }, []);

  useEffect(() => {
    setThumbnailRendererUnavailable(false);
  }, [model, thumbnails]);

  if (layout.items.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      {showLabel ? <Text style={styles.label}>{t('partsThisStep')}</Text> : null}
      <View
        style={[
          styles.grid,
          {
            height: layout.contentHeight,
            width: layout.contentWidth,
          },
        ]}
      >
        {layout.items.map(item => (
          <View
            key={`${item.key}:surface`}
            style={[
              styles.cardSurface,
              {
                borderColor: item.edgeHex,
                height: item.height,
                left: item.x,
                top: item.y,
                width: item.width,
              },
            ]}
          >
            <View style={styles.thumbnailSlot}>
              <View
                style={[
                  styles.partSwatch,
                  shouldRenderThumbnails ? styles.hiddenSwatch : null,
                  {
                    backgroundColor: item.colorHex,
                    borderColor: item.edgeHex,
                  },
                ]}
              />
            </View>
          </View>
        ))}
        {shouldRenderThumbnails ? (
          <BuildGuidePliExpoGlLayer
            layoutSize={{
              height: layout.contentHeight,
              width: layout.contentWidth,
            }}
            model={model}
            thumbnails={thumbnails}
            onUnavailable={handleThumbnailUnavailable}
          />
        ) : null}
        {layout.items.map(item => (
          <View
            key={item.key}
            style={[
              styles.cardContent,
              {
                height: item.height,
                left: item.x,
                top: item.y,
                width: item.width,
              },
            ]}
          >
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
        ))}
      </View>
    </View>
  );
}