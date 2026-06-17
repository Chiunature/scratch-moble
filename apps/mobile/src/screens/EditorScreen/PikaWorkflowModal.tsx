import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { colors, fontSize, fontWeight, spacing } from '../../theme';

export type PikaWorkflowModalKind = 'progress' | 'success' | 'error';

export type PikaWorkflowModalState = {
  visible: boolean;
  kind: PikaWorkflowModalKind;
  title: string;
  message: string;
  progress: number | null;
};

type Props = PikaWorkflowModalState & {
  onClose: () => void;
};

export function PikaWorkflowModal({
  visible,
  kind,
  title,
  message,
  progress,
  onClose,
}: Props) {
  const isProgress = kind === 'progress';
  const canDismiss = !isProgress;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      presentationStyle="overFullScreen" // iOS：盖住刘海/状态栏
      statusBarTranslucent // Android：遮罩延伸到状态栏下
      navigationBarTranslucent // Android：延伸到底部导航区
      onRequestClose={canDismiss ? onClose : undefined}
    >
      <Pressable
        style={styles.backdrop}
        onPress={canDismiss ? onClose : undefined}
      >
        <Pressable
          style={styles.sheet}
          onPress={event => event.stopPropagation()}
        >
          {isProgress ? (
            <ActivityIndicator color={colors.primary} size="large" />
          ) : (
            <View
              style={[
                styles.statusDot,
                kind === 'success'
                  ? styles.statusDotSuccess
                  : styles.statusDotError,
              ]}
            />
          )}

          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>

          {isProgress && progress != null ? (
            <View style={styles.progressBlock}>
              <View style={styles.progressTrack}>
                <View
                  style={[
                    styles.progressFill,
                    { width: `${Math.min(100, Math.max(0, progress))}%` },
                  ]}
                />
              </View>
              <Text style={styles.progressText}>{progress}%</Text>
            </View>
          ) : null}

          {canDismiss ? (
            <Pressable
              style={[
                styles.button,
                kind === 'error' ? styles.buttonError : styles.buttonPrimary,
              ]}
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel="确定"
            >
              <Text style={styles.buttonText}>确定</Text>
            </Pressable>
          ) : null}
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
    width: '100%',
    height: '100%',
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
    alignItems: 'center',
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginBottom: spacing.sm,
  },
  statusDotSuccess: {
    backgroundColor: '#7dffb2',
  },
  statusDotError: {
    backgroundColor: '#ff6b6b',
  },
  title: {
    color: colors.surface,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.extraBold,
    textAlign: 'center',
  },
  message: {
    color: colors.primarySoft,
    fontSize: fontSize.sm,
    textAlign: 'center',
    marginTop: spacing.sm,
    lineHeight: 22,
  },
  progressBlock: {
    width: '100%',
    marginTop: spacing.md,
    gap: spacing.xs,
  },
  progressTrack: {
    width: '100%',
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(148, 163, 184, 0.35)',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
    backgroundColor: colors.primary,
  },
  progressText: {
    color: colors.surface,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    textAlign: 'center',
  },
  button: {
    marginTop: spacing.lg,
    minWidth: 120,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: spacing.sm,
    alignItems: 'center',
  },
  buttonPrimary: {
    backgroundColor: colors.primary,
  },
  buttonError: {
    backgroundColor: '#c0392b',
  },
  buttonText: {
    color: colors.surface,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
  },
});
