import { useMemo } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { useTranslation } from '@scratch-mobile/i18n';

import { mapBleUploadErrorMessage } from '../../../services/ble';
import { colors, fontSize, fontWeight, spacing } from '../../../theme';

export type PikaWorkflowModalKind = 'progress' | 'success' | 'error';

export type PikaWorkflowModalState = {
  visible: boolean;
  kind: PikaWorkflowModalKind;
  titleKey: string;
  titleOptions?: Record<string, unknown>;
  messageKey?: string;
  messageOptions?: Record<string, unknown>;
  /** 编译器/原生层等无法 i18n 的动态文案 */
  messageText?: string;
  /** BLE 上传错误码，展示时按当前语言映射 */
  bleErrorCode?: string;
  progress: number | null;
};

type Props = PikaWorkflowModalState & {
  onClose: () => void;
};

function resolveTransferMessage(
  t: (key: string, options?: Record<string, unknown>) => string,
  options: Record<string, unknown>,
): string {
  const bytecodeSize = options.bytecodeSize as number;
  const hexPreview = (options.hexPreview as string) ?? '';
  const runAfterUpload = options.runAfterUpload as boolean;
  const fileName = options.fileName as string;
  const preview = hexPreview
    ? t('pika.hexPreviewPrefix', { hex: hexPreview })
    : '';
  const compileSummary = t('pika.compileSuccess', {
    size: bytecodeSize,
    preview,
  });
  const action = runAfterUpload
    ? t('pika.actionRun')
    : t('pika.actionDownload');
  return t('pika.transferringMessage', {
    compileSummary,
    action,
    fileName,
  });
}

export function PikaWorkflowModal({
  visible,
  kind,
  titleKey,
  titleOptions,
  messageKey,
  messageOptions,
  messageText,
  bleErrorCode,
  progress,
  onClose,
}: Props) {
  const { t, i18n } = useTranslation('editorShell');
  const { height: windowHeight } = useWindowDimensions();
  const isProgress = kind === 'progress';
  const canDismiss = !isProgress;
  const messageMaxHeight = Math.round(windowHeight * 0.45);

  const title = titleKey ? t(titleKey, titleOptions) : '';
  const message = useMemo(() => {
    if (messageText) {
      return messageText;
    }
    if (bleErrorCode) {
      return mapBleUploadErrorMessage(new Error(bleErrorCode));
    }
    if (!messageKey) {
      return '';
    }
    if (messageKey === 'pika.transferringMessage' && messageOptions) {
      return resolveTransferMessage(t, messageOptions);
    }
    return t(messageKey, messageOptions);
  }, [bleErrorCode, i18n.language, messageKey, messageOptions, messageText, t]);

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
      {/* 遮罩与内容分离：避免外层 Pressable 吃掉 ScrollView 手势 */}
      <View style={styles.backdrop}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={canDismiss ? onClose : undefined}
        />

        <View style={styles.sheet}>
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

          {message ? (
            <ScrollView
              style={[styles.messageScroll, { maxHeight: messageMaxHeight }]}
              nestedScrollEnabled
              keyboardShouldPersistTaps="handled"
              bounces={false}
              showsVerticalScrollIndicator
            >
              <Text
                style={[
                  styles.message,
                  kind === 'error' ? styles.messageError : null,
                ]}
              >
                {message}
              </Text>
            </ScrollView>
          ) : null}

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
              accessibilityLabel={t('common.confirm')}
            >
              <Text style={styles.buttonText}>{t('common.confirm')}</Text>
            </Pressable>
          ) : null}
        </View>
      </View>
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
    maxHeight: '85%',
    backgroundColor: colors.codeBackground,
    borderRadius: spacing.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.primarySoft,
    alignItems: 'center',
    zIndex: 1,
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
  messageScroll: {
    alignSelf: 'stretch',
    marginTop: spacing.sm,
    flexGrow: 0,
    flexShrink: 1,
  },
  message: {
    color: colors.primarySoft,
    fontSize: fontSize.sm,
    textAlign: 'center',
    lineHeight: 22,
  },
  messageError: {
    textAlign: 'left',
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