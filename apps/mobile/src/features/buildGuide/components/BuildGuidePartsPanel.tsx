import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { useTranslation } from '@scratch-mobile/i18n';

import type { BuildGuidePart } from '../types';
import { styles } from './BuildGuidePartsPanel.styles';

type BuildGuidePartsPanelProps = {
  parts: BuildGuidePart[];
};

export function BuildGuidePartsPanel({ parts }: BuildGuidePartsPanelProps) {
  const { t } = useTranslation('buildGuide');

  if (parts.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{t('partsThisStep')}</Text>
      <View style={styles.chipRow}>
        {parts.map(part => (
          <View key={part.id} style={styles.chip}>
            {part.color ? (
              <View style={[styles.colorDot, { backgroundColor: part.color }]} />
            ) : null}
            <Text style={styles.chipText}>{t(part.nameKey)}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}
