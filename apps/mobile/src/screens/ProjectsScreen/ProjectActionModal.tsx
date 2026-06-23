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
} from 'react-native';

import type { ScratchProjectSummary } from '@scratch-mobile/shared';

import { colors, fontSize, fontWeight, shadows, spacing } from '../../theme';

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

  const title =
    mode === 'rename'
      ? '重命名'
      : mode === 'delete'
        ? '删除确认'
        : `管理「${project.name}」`;

  const description =
    mode === 'rename'
      ? `为「${project.name}」输入新名称`
      : mode === 'delete'
        ? '此操作不可撤销'
        : '请选择要执行的操作';

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
                style={({ pressed }) => [
                  styles.closeButton,
                  pressed && styles.closeButtonPressed,
                ]}
                onPress={handleClose}
                disabled={isSubmitting}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel="关闭"
              >
                <Text style={styles.closeButtonText}>×</Text>
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
                      accessibilityLabel="重命名作品"
                    >
                      <Text style={styles.renameActionText}>重命名</Text>
                    </Pressable>
                    <Pressable
                      style={({ pressed }) => [
                        styles.actionButton,
                        styles.deleteActionButton,
                        pressed && styles.actionButtonPressed,
                      ]}
                      onPress={handleSelectDelete}
                      accessibilityRole="button"
                      accessibilityLabel="删除作品"
                    >
                      <Text style={styles.deleteActionText}>删除</Text>
                    </Pressable>
                  </View>
              ) : null}

              {mode === 'rename' ? (
                <View style={styles.renameSection}>
                  <Text style={styles.inputLabel}>新名称</Text>
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
                    placeholder="输入新名称..."
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
                    <Text style={styles.deleteWarningIcon}>⚠</Text>
                    <View style={styles.deleteWarningTextBlock}>
                      <Text style={styles.deleteWarningTitle}>确认删除</Text>
                      <Text style={styles.deleteWarningDesc}>
                        此操作不可撤销，「{project.name}」将被永久删除。
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
                    accessibilityLabel="确认删除"
                  >
                    <Text style={styles.deleteConfirmButtonText}>确认删除</Text>
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

export type ProjectActionToastState = {
  kind: 'success' | 'delete' | 'error';
  title: string;
  message: string;
} | null;

type ToastProps = {
  toast: ProjectActionToastState;
  topInset: number;
  onHidden: () => void;
};

export function ProjectActionToast({ toast, topInset, onHidden }: ToastProps) {
  const translateX = useRef(new Animated.Value(120)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!toast) {
      translateX.setValue(120);
      opacity.setValue(0);
      return;
    }

    Animated.parallel([
      Animated.spring(translateX, {
        toValue: 0,
        friction: 8,
        tension: 80,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start();

    const timer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(translateX, {
          toValue: 120,
          duration: 350,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0,
          duration: 350,
          useNativeDriver: true,
        }),
      ]).start(({ finished }) => {
        if (finished) {
          onHidden();
        }
      });
    }, 3000);

    return () => clearTimeout(timer);
  }, [toast, onHidden, opacity, translateX]);

  if (!toast) {
    return null;
  }

  const iconBg =
    toast.kind === 'success'
      ? styles.toastIconSuccess
      : toast.kind === 'delete'
        ? styles.toastIconDelete
        : styles.toastIconError;

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.toast,
        { top: topInset + spacing.lg, opacity, transform: [{ translateX }] },
      ]}
    >
      <View style={[styles.toastIcon, iconBg]}>
        <Text style={styles.toastIconText}>
          {toast.kind === 'success' ? '✓' : toast.kind === 'delete' ? '×' : '!'}
        </Text>
      </View>
      <View style={styles.toastTextBlock}>
        <Text style={styles.toastTitle}>{toast.title}</Text>
        <Text style={styles.toastMessage}>{toast.message}</Text>
      </View>
    </Animated.View>
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
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonPressed: {
    backgroundColor: 'rgba(255, 255, 255, 0.35)',
  },
  closeButtonText: {
    color: colors.surface,
    fontSize: 20,
    fontWeight: fontWeight.black,
    lineHeight: 22,
    marginTop: -1,
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
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: 12,
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fee2e2',
  },
  deleteWarningIcon: {
    color: '#ef4444',
    fontSize: fontSize.lg,
    fontWeight: fontWeight.black,
    marginTop: 2,
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
  toast: {
    position: 'absolute',
    right: spacing.lg,
    left: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: 14,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    ...shadows.primaryMd,
  },
  toastIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toastIconSuccess: {
    backgroundColor: '#dcfce7',
  },
  toastIconDelete: {
    backgroundColor: '#fee2e2',
  },
  toastIconError: {
    backgroundColor: '#ffedd5',
  },
  toastIconText: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.black,
  },
  toastTextBlock: {
    flex: 1,
  },
  toastTitle: {
    color: colors.ink,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.extraBold,
  },
  toastMessage: {
    color: colors.textSubtle,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    marginTop: 2,
  },
});
