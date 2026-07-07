import React, { useMemo } from 'react';
import { Text, View } from 'react-native';
import { useTranslation } from '@scratch-mobile/i18n';
import type { PartAndColor } from '@scratch-mobile/ldr-engine';

import { styles } from './BuildGuidePartsPanel.styles';

type BuildGuidePartsPanelProps = {
  parts: ReadonlyArray<PartAndColor>;
  showLabel?: boolean;
};

export function BuildGuidePartsPanel({
  parts,
  showLabel = true,
}: BuildGuidePartsPanelProps) {
  const { t } = useTranslation('buildGuide');

  const sortedParts = useMemo(
    () => [...parts].sort((a, b) => a.c - b.c || a.partID.localeCompare(b.partID)),
    [parts],
  );

  if (sortedParts.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      {showLabel ? <Text style={styles.label}>{t('partsList')}</Text> : null}
      <View style={styles.chipRow}>
        {sortedParts.map(part => (
          <View key={part.key} style={styles.chip}>
            <View style={[styles.colorDot, { backgroundColor: part.colorHex }]} />
            <Text style={styles.chipText}>
              {part.partID} × {part.amount}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}
