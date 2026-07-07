import React from 'react';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { useTranslation } from '@scratch-mobile/i18n';
import type { PartAndColor } from '@scratch-mobile/ldr-engine';

import { BuildGuidePartsPanel } from './BuildGuidePartsPanel';
import { styles } from './BuildGuidePartsModal.styles';

type BuildGuidePartsModalProps = {
  visible: boolean;
  parts: ReadonlyArray<PartAndColor>;
  onClose: () => void;
};

export function BuildGuidePartsModal({
  visible,
  parts,
  onClose,
}: BuildGuidePartsModalProps) {
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
        <Pressable style={styles.sheet} onPress={event => event.stopPropagation()}>
          <View style={styles.header}>
            <Text style={styles.title}>{t('partsList')}</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('closePartsList')}
              onPress={onClose}
            >
              <Text style={styles.closeButton}>{t('closePartsList')}</Text>
            </Pressable>
          </View>
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            <BuildGuidePartsPanel parts={parts} showLabel={false} />
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
