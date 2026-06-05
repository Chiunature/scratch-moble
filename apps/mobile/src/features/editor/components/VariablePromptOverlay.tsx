import { useEffect, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import type { RnVariablePromptOpenMessage } from '@scratch-mobile/shared';

import { colors, fontSize, fontWeight, spacing } from '../../../theme';

type Props = {
  session: RnVariablePromptOpenMessage | null;
  onCommit: (sessionId: string, name: string) => void;
  onCancel: (sessionId: string) => void;
};

export function VariablePromptOverlay({
  session,
  onCommit,
  onCancel,
}: Props) {
  const [name, setName] = useState('');
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    setName(session?.defaultValue ?? '');
    if (session) {
      const timer = setTimeout(() => inputRef.current?.focus(), 80);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [session]);

  if (!session) {
    return null;
  }

  const title = session.title || (session.varType === 'list' ? '建立列表' : '建立变量');
  const placeholder = session.varType === 'list' ? '列表名称' : '变量名称';
  const trimmedName = name.trim();

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      <Pressable
        style={styles.backdrop}
        onPress={() => onCancel(session.sessionId)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <Pressable style={styles.card} onPress={event => event.stopPropagation()}>
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.message}>{session.message}</Text>
            <TextInput
              ref={inputRef}
              value={name}
              placeholder={placeholder}
              placeholderTextColor={colors.textFaint}
              onChangeText={setName}
              onSubmitEditing={() => {
                if (trimmedName) {
                  onCommit(session.sessionId, trimmedName);
                }
              }}
              returnKeyType="done"
              selectTextOnFocus
              style={styles.input}
            />
            <View style={styles.actions}>
              <Pressable
                style={[styles.button, styles.secondaryButton]}
                onPress={() => onCancel(session.sessionId)}
              >
                <Text style={[styles.buttonText, styles.secondaryButtonText]}>
                  取消
                </Text>
              </Pressable>
              <Pressable
                style={[
                  styles.button,
                  styles.primaryButton,
                  !trimmedName && styles.disabledButton,
                ]}
                disabled={!trimmedName}
                onPress={() => onCommit(session.sessionId, trimmedName)}
              >
                <Text style={[styles.buttonText, styles.primaryButtonText]}>
                  确定
                </Text>
              </Pressable>
            </View>
          </Pressable>
        </KeyboardAvoidingView>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.28)',
    padding: spacing.xl,
  },
  card: {
    width: 320,
    maxWidth: '100%',
    borderRadius: 18,
    backgroundColor: colors.surface,
    padding: spacing.xl,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  title: {
    color: colors.ink,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.extraBold,
    textAlign: 'center',
  },
  message: {
    marginTop: spacing.sm,
    color: colors.textMuted,
    fontSize: fontSize.sm,
    lineHeight: 20,
    textAlign: 'center',
  },
  input: {
    marginTop: spacing.lg,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    color: colors.ink,
    fontSize: fontSize.md,
    backgroundColor: '#f8fafc',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
    marginTop: spacing.xl,
  },
  button: {
    minWidth: 86,
    borderRadius: 999,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  secondaryButton: {
    backgroundColor: '#e2e8f0',
  },
  primaryButton: {
    backgroundColor: '#ff8c1a',
  },
  disabledButton: {
    opacity: 0.45,
  },
  buttonText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
  },
  secondaryButtonText: {
    color: colors.ink,
  },
  primaryButtonText: {
    color: colors.surface,
  },
});
