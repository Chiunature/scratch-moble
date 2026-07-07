import React from 'react';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { useTranslation } from '@scratch-mobile/i18n';

import { styles } from './BuildGuideStepPickerModal.styles';

type BuildGuideStepPickerModalProps = {
  visible: boolean;
  currentIndex: number;
  totalSteps: number;
  onSelectStep: (index: number) => void;
  onClose: () => void;
};

export function BuildGuideStepPickerModal({
  visible,
  currentIndex,
  totalSteps,
  onSelectStep,
  onClose,
}: BuildGuideStepPickerModalProps) {
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
            <Text style={styles.title}>{t('jumpToStep')}</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('closePartsList')}
              onPress={onClose}
            >
              <Text style={styles.closeButton}>{t('closePartsList')}</Text>
            </Pressable>
          </View>
          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={styles.grid}>
              {Array.from({ length: totalSteps }, (_, index) => {
                const isActive = index === currentIndex;
                const isComplete = index < currentIndex;

                return (
                  <Pressable
                    key={index}
                    accessibilityRole="button"
                    accessibilityLabel={t('stepButtonLabel', { step: index + 1 })}
                    accessibilityState={{ selected: isActive }}
                    onPress={() => {
                      onSelectStep(index);
                      onClose();
                    }}
                    style={({ pressed }) => [
                      styles.stepButton,
                      isComplete && styles.stepButtonComplete,
                      isActive && styles.stepButtonActive,
                      pressed && styles.stepButtonPressed,
                    ]}
                  >
                    <Text
                      style={[
                        styles.stepButtonText,
                        isComplete && styles.stepButtonTextComplete,
                        isActive && styles.stepButtonTextActive,
                      ]}
                    >
                      {index + 1}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
