import React from 'react';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { useTranslation } from '@scratch-mobile/i18n';
import type { LoadedLdrModel, PartAndColor } from '@scratch-mobile/ldr-engine';

import { BuildGuidePartsPanel } from './BuildGuidePartsPanel';
import { BuildGuidePliPanel } from '../pli/components/BuildGuidePliPanel';
import type { BuildGuidePliItemViewModel } from '../pli/data/buildPliViewModels';
import { styles } from './BuildGuidePartsModal.styles';

type BuildGuidePartsModalProps = {
  visible: boolean;
  parts: ReadonlyArray<PartAndColor>;
  pliItems: ReadonlyArray<BuildGuidePliItemViewModel>;
  pliError: Error | null;
  pliModel: LoadedLdrModel | null;
  onClose: () => void;
};

export function BuildGuidePartsModal({
  visible,
  parts,
  pliItems,
  pliError,
  pliModel,
  onClose,
}: BuildGuidePartsModalProps) {
  const { t } = useTranslation('buildGuide');
  const shouldShowPli = pliError == null && pliItems.length > 0;

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
            {shouldShowPli ? (
              <BuildGuidePliPanel items={pliItems} model={pliModel} />
            ) : (
              <BuildGuidePartsPanel parts={parts} showLabel={false} />
            )}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
