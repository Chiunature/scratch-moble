import React from 'react';
import { ScrollView, Text, View } from 'react-native';
import { useTranslation } from '@scratch-mobile/i18n';
import type { LoadedLdrModel } from '@scratch-mobile/ldr-engine';

import { spacing } from '../../../theme';
import type { BuildGuidePliItemViewModel } from '../pli/data/buildPliViewModels';
import { BuildGuidePliPanel } from '../pli/components/BuildGuidePliPanel';
import { PLI_SIDE_PANEL_WIDTH, styles } from './BuildGuidePliSidePanel.styles';

type BuildGuidePliSidePanelProps = {
  items: ReadonlyArray<BuildGuidePliItemViewModel>;
  error: Error | null;
  model: LoadedLdrModel | null;
  paddingLeft?: number;
};

const PANEL_CONTENT_WIDTH = PLI_SIDE_PANEL_WIDTH - spacing.sm * 2;

export function BuildGuidePliSidePanel({
  items,
  error,
  model,
  paddingLeft = 0,
}: BuildGuidePliSidePanelProps) {
  const { t } = useTranslation('buildGuide');
  const shouldShowPli = error == null && items.length > 0;
  const panelWidth = PLI_SIDE_PANEL_WIDTH + paddingLeft;

  return (
    <View style={[styles.container, { width: panelWidth, paddingLeft }]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {shouldShowPli ? (
          <BuildGuidePliPanel
            items={items}
            model={model}
            showLabel={false}
            containerWidth={PANEL_CONTENT_WIDTH}
          />
        ) : (
          <Text style={styles.emptyText}>
            {error ? error.message : t('pliEmpty')}
          </Text>
        )}
      </ScrollView>
    </View>
  );
}
