import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from '@scratch-mobile/i18n';

import {
  buildHostBytecodeFileName,
  HOST_PROGRAM_SLOTS,
} from '../../services/ble';
import { colors, fontSize, fontWeight, spacing } from '../../theme';

type Props = {
  visible: boolean;
  selectedSlot: number;
  onSelect: (slot: number) => void;
  onClose: () => void;
};

export function ProgramSlotPickerModal({
  visible,
  selectedSlot,
  onSelect,
  onClose,
}: Props) {
  const { t } = useTranslation('editorShell');

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      presentationStyle="overFullScreen" // iOS：盖住刘海/状态栏
      statusBarTranslucent // Android：遮罩延伸到状态栏下
      navigationBarTranslucent // Android：延伸到底部导航区
      onRequestClose={onClose}
    >
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable
          style={styles.sheet}
          onPress={event => event.stopPropagation()}
        >
          <Text style={styles.title}>{t('programSlot.title')}</Text>
          <Text style={styles.subtitle}>{t('programSlot.subtitle')}</Text>
          <View style={styles.grid}>
            {HOST_PROGRAM_SLOTS.map(slot => {
              const selected = slot === selectedSlot;
              return (
                <Pressable
                  key={slot}
                  style={[styles.slotItem, selected && styles.slotItemSelected]}
                  onPress={() => {
                    onSelect(slot);
                    onClose();
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={t('programSlot.slotLabel', { slot })}
                  accessibilityState={{ selected }}
                >
                  <Text
                    style={[
                      styles.slotNumber,
                      selected && styles.slotTextSelected,
                    ]}
                  >
                    {slot}
                  </Text>
                  <Text
                    style={[
                      styles.slotFile,
                      selected && styles.slotTextSelected,
                    ]}
                  >
                    {buildHostBytecodeFileName(slot)}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(2, 6, 23, 0.55)',
    padding: spacing.lg,
  },
  sheet: {
    width: '100%',
    maxWidth: 320,
    backgroundColor: colors.codeBackground,
    borderRadius: spacing.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.primarySoft,
  },
  title: {
    color: colors.surface,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.extraBold,
    textAlign: 'center',
  },
  subtitle: {
    color: colors.primarySoft,
    fontSize: fontSize.xs,
    textAlign: 'center',
    marginTop: spacing.xs,
    marginBottom: spacing.md,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    justifyContent: 'center',
  },
  slotItem: {
    width: 56,
    height: 56,
    borderRadius: spacing.sm,
    borderWidth: 1,
    borderColor: colors.primarySoft,
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  slotItemSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  slotNumber: {
    color: colors.surface,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.extraBold,
    lineHeight: fontSize.lg + 2,
  },
  slotFile: {
    color: colors.primarySoft,
    fontSize: 10,
    marginTop: 2,
  },
  slotTextSelected: {
    color: colors.surface,
  },
});
