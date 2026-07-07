import React, { useMemo } from 'react';
import { Text, View } from 'react-native';
import { useTranslation } from '@scratch-mobile/i18n';
import type { PartAndColor } from '@scratch-mobile/ldr-engine';

import { styles } from './BuildGuidePartsPanel.styles';

type BuildGuidePartsPanelProps = {
  parts: ReadonlyArray<PartAndColor>;
};

export function BuildGuidePartsPanel({ parts }: BuildGuidePartsPanelProps) {
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
      <Text style={styles.label}>{t('partsList')}</Text>
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
