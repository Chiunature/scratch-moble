import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  Image,
} from 'react-native';
import {
  resolveProjectDisplayName,
  useTranslation,
} from '@scratch-mobile/i18n';

import type { ScratchProjectSummary } from '@scratch-mobile/shared';

import { colors, fontSize, fontWeight, shadows, spacing } from '../../theme';
import deleteWarningIcon from '../../../assets/notifications/deleteWarning.png';
import deleteIcon from '../../../assets/notifications/delete.png';
type ActionMode = 'select' | 'rename' | 'delete';

export type ProjectRenamePayload = {
  projectId: string;
  oldName: string;
  newName: string;
};

export type ProjectDeletePayload = {
  projectId: string;
  projectName: string;
};

type Props = {
  visible: boolean;
  project: ScratchProjectSummary | null;
  onClose: () => void;
  onRename: (payload: ProjectRenamePayload) => Promise<void>;
  onDelete: (payload: ProjectDeletePayload) => Promise<void>;
};

export function ProjectActionModal({
  visible,
  project,
  onClose,
  onRename,
  onDelete,
}: Props) {
  const { t } = useTranslation('projects');
  const [mode, setMode] = useState<ActionMode>('select');
  const [renameValue, setRenameValue] = useState('');
  const [inputError, setInputError] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const contentScale = useRef(new Animated.Value(0.9)).current;
  const contentTranslateY = useRef(new Animated.Value(20)).current;

  const resetState = useCallback(() => {
    setMode('select');
    setRenameValue('');
    setInputError(false);
    setIsSubmitting(false);
  }, []);

  useEffect(() => {
    if (!visible) {
      overlayOpacity.setValue(0);
      contentScale.setValue(0.9);
      contentTranslateY.setValue(20);
      return;
    }

    if (project) {
      setRenameValue(project.name);
    }
    setMode('select');
    setInputError(false);
    setIsSubmitting(false);

    Animated.parallel([
      Animated.timing(overlayOpacity, {
        toValue: 1,
        duration: 300,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(contentScale, {
        toValue: 1,
        duration: 350,
        easing: Easing.out(Easing.back(1.2)),
        useNativeDriver: true,
      }),
      Animated.timing(contentTranslateY, {
        toValue: 0,
        duration: 350,
        easing: Easing.out(Easing.back(1.2)),
        useNativeDriver: true,
      }),
    ]).start();
  }, [visible, project, overlayOpacity, contentScale, contentTranslateY]);

  const handleClose = useCallback(() => {
    if (isSubmitting) {
      return;
    }
    resetState();
    onClose();
  }, [isSubmitting, onClose, resetState]);

  const handleSelectRename = useCallback(() => {
    if (!project) {
      return;
    }
    setMode('rename');
    setRenameValue(project.name);
    setInputError(false);
  }, [project]);

  const handleSelectDelete = useCallback(() => {
    setMode('delete');
    setInputError(false);
  }, []);

  const handleRenameSubmit = useCallback(async () => {
    if (!project || isSubmitting) {
      return;
    }
    const trimmed = renameValue.trim();
    if (!trimmed) {
      setInputError(true);
      return;
    }
    setIsSubmitting(true);
    try {
      await onRename({
        projectId: project.id,
        oldName: project.name,
        newName: trimmed,
      });
      handleClose();
    } finally {
      setIsSubmitting(false);
    }
  }, [handleClose, isSubmitting, onRename, project, renameValue]);

  const handleDeleteConfirm = useCallback(async () => {
    if (!project || isSubmitting) {
      return;
    }
    setIsSubmitting(true);
    try {
      await onDelete({
        projectId: project.id,
        projectName: project.name,
      });
      handleClose();
    } finally {
      setIsSubmitting(false);
    }
  }, [handleClose, isSubmitting, onDelete, project]);

  if (!project) {
    return null;
  }

  const displayName = resolveProjectDisplayName(project.name);

  const title =
    mode === 'rename'
      ? t('modal.renameTitle')
      : mode === 'delete'
      ? t('modal.deleteTitle')
      : t('modal.manageTitle', { name: displayName });

  const description =
    mode === 'rename'
      ? t('modal.renameDescription', { name: displayName })
      : mode === 'delete'
      ? t('modal.deleteDescription')
      : t('modal.selectDescription');

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      presentationStyle="overFullScreen"
      statusBarTranslucent
      navigationBarTranslucent
      onRequestClose={handleClose}
    >
      <Animated.View style={[styles.backdrop, { opacity: overlayOpacity }]}>
        <Pressable
          style={styles.backdropPressable}
          onPress={isSubmitting ? undefined : handleClose}
        >
          <Animated.View
            style={[
              styles.sheet,
              {
                opacity: overlayOpacity,
                transform: [
                  { scale: contentScale },
                  { translateY: contentTranslateY },
                ],
              },
            ]}
            onStartShouldSetResponder={() => true}
          >
            <View style={styles.header}>
              <View style={styles.headerOverlay} />
              <Pressable
                style={styles.closeButton}
                onPress={handleClose}
                disabled={isSubmitting}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel={t('modal.close')}
              >
                <Image source={deleteIcon} style={styles.closeButtonIcon} />
              </Pressable>
              <Text style={styles.headerTitle} numberOfLines={2}>
                {title}
              </Text>
              <Text style={styles.headerDesc} numberOfLines={2}>
                {description}
              </Text>
            </View>

            <View style={styles.body}>
              {mode === 'select' ? (
                <View style={styles.actionRow}>
                  <Pressable
                    style={({ pressed }) => [
                      styles.actionButton,
                      styles.renameActionButton,
                      pressed && styles.actionButtonPressed,
                    ]}
                    onPress={handleSelectRename}
                    accessibilityRole="button"
                    accessibilityLabel={t('modal.renameProjectAccessibility')}
                  >
                    <Text style={styles.renameActionText}>
                      {t('modal.renameAction')}
                    </Text>
                  </Pressable>
                  <Pressable
                    style={({ pressed }) => [
                      styles.actionButton,
                      styles.deleteActionButton,
                      pressed && styles.actionButtonPressed,
                    ]}
                    onPress={handleSelectDelete}
                    accessibilityRole="button"
                    accessibilityLabel={t('modal.deleteProjectAccessibility')}
                  >
                    <Text style={styles.deleteActionText}>
                      {t('modal.deleteAction')}
                    </Text>
                  </Pressable>
                </View>
              ) : null}

              {mode === 'rename' ? (
                <View style={styles.renameSection}>
                  <Text style={styles.inputLabel}>
                    {t('modal.newNameLabel')}
                  </Text>
                  <TextInput
                    value={renameValue}
                    onChangeText={value => {
                      setRenameValue(value);
                      if (inputError && value.trim()) {
                        setInputError(false);
                      }
                    }}
                    onSubmitEditing={() => {
                      void handleRenameSubmit();
                    }}
                    placeholder={t('modal.newNamePlaceholder')}
                    placeholderTextColor={colors.textFaint}
                    returnKeyType="done"
                    editable={!isSubmitting}
                    autoFocus
                    style={[
                      styles.renameInput,
                      inputError && styles.renameInputError,
                    ]}
                  />
                </View>
              ) : null}

              {mode === 'delete' ? (
                <View style={styles.deleteSection}>
                  <View style={styles.deleteWarning}>
                    <Image
                      source={deleteWarningIcon}
                      style={styles.deleteWarningIcon}
                    />
                    <View style={styles.deleteWarningTextBlock}>
                      <Text style={styles.deleteWarningTitle}>
                        {t('modal.deleteWarningTitle')}
                      </Text>
                      <Text style={styles.deleteWarningDesc}>
                        {t('modal.deleteWarningMessage', { name: displayName })}
                      </Text>
                    </View>
                  </View>
                  <Pressable
                    style={({ pressed }) => [
                      styles.deleteConfirmButton,
                      pressed && styles.actionButtonPressed,
                      isSubmitting && styles.deleteConfirmButtonDisabled,
                    ]}
                    onPress={() => {
                      void handleDeleteConfirm();
                    }}
                    disabled={isSubmitting}
                    accessibilityRole="button"
                    accessibilityLabel={t('modal.confirmDeleteAccessibility')}
                  >
                    <Text style={styles.deleteConfirmButtonText}>
                      {t('modal.confirmDelete')}
                    </Text>
                  </Pressable>
                </View>
              ) : null}
            </View>
          </Animated.View>
        </Pressable>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
  },
  backdropPressable: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  sheet: {
    width: '100%',
    maxWidth: 320,
    borderRadius: 16,
    backgroundColor: colors.surface,
    overflow: 'hidden',
    ...shadows.primaryMd,
  },
  header: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    paddingTop: spacing.md,
    alignItems: 'center',
    overflow: 'hidden',
  },
  headerOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  closeButton: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    zIndex: 2,
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonIcon: {
    width: 28,
    height: 28,
  },
  headerTitle: {
    color: colors.surface,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.black,
    textAlign: 'center',
    paddingHorizontal: spacing['2xl'],
  },
  headerDesc: {
    color: 'rgba(255, 255, 255, 0.82)',
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
  body: {
    padding: spacing.lg,
  },
  actionRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  actionButton: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1.5,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionButtonPressed: {
    opacity: 0.82,
    transform: [{ scale: 0.98 }],
  },
  renameActionButton: {
    borderColor: '#c7d2fe',
    backgroundColor: '#eef2ff',
  },
  renameActionText: {
    color: colors.primary,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.extraBold,
  },
  deleteActionButton: {
    borderColor: '#fecaca',
    backgroundColor: '#fef2f2',
  },
  deleteActionText: {
    color: '#dc2626',
    fontSize: fontSize.sm,
    fontWeight: fontWeight.extraBold,
  },
  renameSection: {
    gap: spacing.sm,
  },
  inputLabel: {
    color: colors.textMuted,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.extraBold,
    marginBottom: spacing.sm,
  },
  renameInput: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    color: colors.ink,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
  },
  renameInputError: {
    borderColor: '#ef4444',
    borderWidth: 2,
  },
  deleteSection: {
    gap: spacing.md,
  },
  deleteWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: 12,
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fee2e2',
  },
  deleteWarningIcon: {
    width: 24,
    height: 24,
  },
  deleteWarningTextBlock: {
    flex: 1,
  },
  deleteWarningTitle: {
    color: '#991b1b',
    fontSize: fontSize.sm,
    fontWeight: fontWeight.extraBold,
  },
  deleteWarningDesc: {
    color: '#dc2626',
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    marginTop: spacing.xs,
    lineHeight: 18,
  },
  deleteConfirmButton: {
    borderRadius: 12,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ef4444',
  },
  deleteConfirmButtonDisabled: {
    opacity: 0.6,
  },
  deleteConfirmButtonText: {
    color: colors.surface,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.extraBold,
  },
});
