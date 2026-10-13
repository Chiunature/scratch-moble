import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  AppState,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';

import {
  clearAssistantConnection,
  generateAssistantProposal,
  getAssistantConnection,
  isAssistantSecureStorageAvailable,
  normalizeAssistantBaseUrl,
  saveAssistantConnection,
  type AssistantConnectionProfile,
} from '../../services/assistant';
import { colors, fontSize, fontWeight, shadows, spacing } from '../../theme';

export type AssistantConnectionSettingsProps = {
  visible: boolean;
  onClose: () => void;
  onSaved?: () => void;
};

const DEFAULT_BASE_URL = 'https://api.openai.com/v1';
const DEFAULT_PROFILE_ID = 'openai-compatible';

function confirmAction(
  title: string,
  message: string,
  confirmText: string,
): Promise<boolean> {
  return new Promise(resolve => {
    Alert.alert(
      title,
      message,
      [
        { text: '取消', style: 'cancel', onPress: () => resolve(false) },
        { text: confirmText, onPress: () => resolve(true) },
      ],
      { cancelable: true, onDismiss: () => resolve(false) },
    );
  });
}

function safeErrorMessage(error: unknown, apiKey: string): string {
  let message =
    error instanceof Error ? error.message : '操作失败，请稍后重试。';
  if (apiKey) message = message.split(apiKey).join('••••••••');
  message = message.replace(/Bearer\s+\S+/gi, 'Bearer ••••••••');
  return message.slice(0, 300);
}

function validateInputs(
  baseUrl: string,
  model: string,
  apiKey: string,
): string {
  const normalized = normalizeAssistantBaseUrl(baseUrl);
  if (new URL(normalized).protocol !== 'https:') {
    throw new Error('模型接口地址必须使用 HTTPS。');
  }
  if (!model.trim()) throw new Error('模型名称不能为空。');
  if (!apiKey.trim()) throw new Error('API Key 不能为空。');
  return normalized;
}

export function AssistantConnectionSettings({
  visible,
  onClose,
  onSaved,
}: AssistantConnectionSettingsProps) {
  const [baseUrl, setBaseUrl] = useState(DEFAULT_BASE_URL);
  const [model, setModel] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [strictSchema, setStrictSchema] = useState(true);
  const [persistSecurely, setPersistSecurely] = useState(false);
  const secureStorageAvailable = isAssistantSecureStorageAvailable();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);
  const profileIdRef = useRef(DEFAULT_PROFILE_ID);
  const originalBaseUrlRef = useRef(DEFAULT_BASE_URL);
  const addressClearedKeyRef = useRef(false);
  const operationRef = useRef(0);
  const actionRef = useRef<'save' | 'test' | 'clear' | null>(null);
  const testControllerRef = useRef<AbortController | null>(null);
  const mountedRef = useRef(true);
  const mutationInFlightRef = useRef(false);

  const stopTest = useCallback((updateState: boolean) => {
    const wasTesting =
      testControllerRef.current !== null || actionRef.current === 'test';
    if (wasTesting) operationRef.current += 1;
    testControllerRef.current?.abort();
    testControllerRef.current = null;
    if (actionRef.current === 'test') actionRef.current = null;
    if (updateState) setTesting(false);
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      operationRef.current += 1;
      testControllerRef.current?.abort();
    };
  }, []);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', nextState => {
      if (nextState !== 'active') {
        stopTest(true);
        if (!mutationInFlightRef.current && actionRef.current) {
          operationRef.current += 1;
          actionRef.current = null;
        }
        setShowApiKey(false);
      }
    });
    return () => subscription.remove();
  }, [stopTest]);

  useEffect(() => {
    if (!visible) {
      stopTest(true);
      operationRef.current += 1;
      if (!mutationInFlightRef.current) actionRef.current = null;
      setApiKey('');
      setShowApiKey(false);
      return;
    }

    const operation = ++operationRef.current;
    setLoading(true);
    setErrorText(null);
    setPersistSecurely(false);
    setShowApiKey(false);
    addressClearedKeyRef.current = false;

    getAssistantConnection()
      .then(connection => {
        if (!mountedRef.current || operation !== operationRef.current) return;
        const nextBaseUrl = connection?.profile.baseUrl ?? DEFAULT_BASE_URL;
        profileIdRef.current = connection?.profile.id ?? DEFAULT_PROFILE_ID;
        originalBaseUrlRef.current = nextBaseUrl;
        setBaseUrl(nextBaseUrl);
        setModel(connection?.profile.model ?? '');
        setApiKey(connection?.apiKey ?? '');
        setStrictSchema(connection?.profile.supportsJsonSchema !== false);
      })
      .catch(error => {
        if (!mountedRef.current || operation !== operationRef.current) return;
        setErrorText(safeErrorMessage(error, ''));
      })
      .finally(() => {
        if (mountedRef.current && operation === operationRef.current) {
          setLoading(false);
        }
      });
  }, [stopTest, visible]);

  const handleBaseUrlChange = useCallback((nextValue: string) => {
    setBaseUrl(nextValue);
    if (
      !addressClearedKeyRef.current &&
      nextValue.trim() !== originalBaseUrlRef.current.trim()
    ) {
      addressClearedKeyRef.current = true;
      setApiKey('');
      setShowApiKey(false);
    }
  }, []);

  const makeProfile = useCallback(
    (normalizedBaseUrl: string): AssistantConnectionProfile => ({
      id: profileIdRef.current,
      baseUrl: normalizedBaseUrl,
      model: model.trim(),
      supportsJsonSchema: strictSchema,
    }),
    [model, strictSchema],
  );

  const handleSave = useCallback(async () => {
    if (actionRef.current || saving || testing || loading) return;
    actionRef.current = 'save';
    setErrorText(null);

    let normalizedBaseUrl: string;
    try {
      normalizedBaseUrl = validateInputs(baseUrl, model, apiKey);
    } catch (error) {
      actionRef.current = null;
      setErrorText(safeErrorMessage(error, apiKey));
      return;
    }

    const operation = ++operationRef.current;
    const target = normalizedBaseUrl;
    const confirmed = await confirmAction(
      '确认模型服务',
      `请求将发送到 ${target}。程序代码、积木摘要、作品标识和最近对话会交给该第三方处理，服务商可能收费。${
        persistSecurely
          ? '\n\nAPI Key 将保存到系统安全凭据存储。'
          : '\n\nAPI Key 默认仅保留在本次应用会话中。'
      }`,
      '确认保存',
    );
    if (!mountedRef.current || operation !== operationRef.current) return;
    if (!confirmed || actionRef.current !== 'save') {
      actionRef.current = null;
      return;
    }

    mutationInFlightRef.current = true;
    setSaving(true);
    try {
      const profile = makeProfile(normalizedBaseUrl);
      await saveAssistantConnection(profile, apiKey.trim(), persistSecurely);
      if (!mountedRef.current || operation !== operationRef.current) return;
      profileIdRef.current = profile.id;
      originalBaseUrlRef.current = profile.baseUrl;
      addressClearedKeyRef.current = false;
      Alert.alert(
        '配置已保存',
        persistSecurely
          ? '已安全保存连接配置。'
          : '配置仅在本次应用会话中有效。',
      );
      onSaved?.();
      onClose();
    } catch (error) {
      if (mountedRef.current && operation === operationRef.current) {
        setErrorText(safeErrorMessage(error, apiKey));
      }
    } finally {
      mutationInFlightRef.current = false;
      actionRef.current = null;
      if (mountedRef.current) setSaving(false);
    }
  }, [
    apiKey,
    baseUrl,
    loading,
    makeProfile,
    model,
    onClose,
    onSaved,
    persistSecurely,
    saving,
    testing,
  ]);

  const handleTest = useCallback(async () => {
    if (actionRef.current || saving || testing || loading) return;
    actionRef.current = 'test';
    setErrorText(null);

    let normalizedBaseUrl: string;
    try {
      normalizedBaseUrl = validateInputs(baseUrl, model, apiKey);
    } catch (error) {
      actionRef.current = null;
      setErrorText(safeErrorMessage(error, apiKey));
      return;
    }

    const operation = ++operationRef.current;
    const confirmed = await confirmAction(
      '测试连接可能产生费用',
      `将向 ${normalizedBaseUrl} 发送一次最小解释请求。第三方服务商可能按请求或 Token 收费。`,
      '继续测试',
    );
    if (!mountedRef.current || operation !== operationRef.current) return;
    if (!confirmed || actionRef.current !== 'test') {
      actionRef.current = null;
      return;
    }

    const controller = new AbortController();
    testControllerRef.current = controller;
    setTesting(true);
    try {
      await generateAssistantProposal({
        profile: makeProfile(normalizedBaseUrl),
        apiKey: apiKey.trim(),
        prompt:
          '请仅解释：这是一次连接测试。不要创建或修改积木，operations 必须为空。',
        context: {
          projectId: 'connection-test',
          workspaceHash: '',
          generatedCode: '',
          blocks: [],
        },
        conversation: [],
        signal: controller.signal,
      });
      if (mountedRef.current && operation === operationRef.current) {
        Alert.alert('连接成功', '模型连接与结构化响应验证成功。');
      }
    } catch (error) {
      if (mountedRef.current && operation === operationRef.current) {
        setErrorText(safeErrorMessage(error, apiKey));
      }
    } finally {
      if (mountedRef.current && operation === operationRef.current) {
        testControllerRef.current = null;
        actionRef.current = null;
        setTesting(false);
      }
    }
  }, [apiKey, baseUrl, loading, makeProfile, model, saving, testing]);

  const handleClear = useCallback(async () => {
    if (actionRef.current || saving || testing || loading) return;
    actionRef.current = 'clear';
    const operation = ++operationRef.current;
    const confirmed = await confirmAction(
      '清除模型配置',
      '将清除本次会话和系统安全凭据存储中的连接配置。',
      '清除',
    );
    if (!mountedRef.current || operation !== operationRef.current) return;
    if (!confirmed || actionRef.current !== 'clear') {
      actionRef.current = null;
      return;
    }

    mutationInFlightRef.current = true;
    setSaving(true);
    setErrorText(null);
    try {
      await clearAssistantConnection();
      if (!mountedRef.current || operation !== operationRef.current) return;
      profileIdRef.current = DEFAULT_PROFILE_ID;
      originalBaseUrlRef.current = DEFAULT_BASE_URL;
      addressClearedKeyRef.current = false;
      setBaseUrl(DEFAULT_BASE_URL);
      setModel('');
      setApiKey('');
      setShowApiKey(false);
      setStrictSchema(true);
      setPersistSecurely(false);
      onSaved?.();
    } catch (error) {
      if (mountedRef.current && operation === operationRef.current) {
        setErrorText(safeErrorMessage(error, apiKey));
      }
    } finally {
      mutationInFlightRef.current = false;
      actionRef.current = null;
      if (mountedRef.current) setSaving(false);
    }
  }, [apiKey, loading, onSaved, saving, testing]);

  const handleClose = useCallback(() => {
    if (saving) return;
    stopTest(true);
    operationRef.current += 1;
    actionRef.current = null;
    setApiKey('');
    setShowApiKey(false);
    onClose();
  }, [onClose, saving, stopTest]);

  const busy = loading || saving || testing;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
      supportedOrientations={['portrait', 'landscape']}
    >
      <KeyboardAvoidingView
        style={styles.backdrop}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.card}>
          <View style={styles.header}>
            <View style={styles.headerCopy}>
              <Text style={styles.title}>模型连接</Text>
              <Text style={styles.subtitle}>配置 OpenAI 兼容的 HTTPS 服务</Text>
            </View>
            <Pressable
              onPress={handleClose}
              style={styles.closeButton}
              accessibilityRole="button"
              accessibilityLabel="关闭模型配置"
            >
              <Text style={styles.closeText}>×</Text>
            </Pressable>
          </View>

          {loading ? (
            <View style={styles.loadingArea}>
              <ActivityIndicator color={colors.primary} />
            </View>
          ) : (
            <ScrollView
              style={styles.formScroll}
              contentContainerStyle={styles.formContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <Text style={styles.label}>HTTPS 地址</Text>
              <TextInput
                value={baseUrl}
                onChangeText={handleBaseUrlChange}
                style={styles.input}
                placeholder="https://api.example.com/v1"
                placeholderTextColor={colors.textFaint}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="url"
                editable={!busy}
              />
              {addressClearedKeyRef.current ? (
                <Text style={styles.fieldHint}>
                  地址已改变。为避免误用，旧 API Key 已从表单清除。
                </Text>
              ) : null}

              <Text style={styles.label}>模型名称</Text>
              <TextInput
                value={model}
                onChangeText={setModel}
                style={styles.input}
                placeholder="模型 ID"
                placeholderTextColor={colors.textFaint}
                autoCapitalize="none"
                autoCorrect={false}
                editable={!busy}
              />

              <Text style={styles.label}>API Key</Text>
              <View style={styles.keyRow}>
                <TextInput
                  value={apiKey}
                  onChangeText={setApiKey}
                  style={[styles.input, styles.keyInput]}
                  placeholder="仅用于请求，不会写入日志"
                  placeholderTextColor={colors.textFaint}
                  autoCapitalize="none"
                  autoCorrect={false}
                  secureTextEntry={!showApiKey}
                  textContentType="password"
                  editable={!busy}
                />
                <Pressable
                  style={styles.revealButton}
                  onPress={() => setShowApiKey(current => !current)}
                  disabled={busy}
                  accessibilityRole="button"
                  accessibilityLabel={
                    showApiKey ? '隐藏 API Key' : '显示 API Key'
                  }
                >
                  <Text style={styles.revealText}>
                    {showApiKey ? '隐藏' : '显示'}
                  </Text>
                </Pressable>
              </View>

              <View style={styles.optionRow}>
                <View style={styles.optionCopy}>
                  <Text style={styles.optionTitle}>严格 JSON Schema</Text>
                  <Text style={styles.optionHint}>
                    关闭后仅要求 JSON 对象，不会自动修复模型响应。
                  </Text>
                </View>
                <Switch
                  value={strictSchema}
                  onValueChange={setStrictSchema}
                  disabled={busy}
                  trackColor={{ false: '#cbd5e1', true: colors.primarySoft }}
                  thumbColor={strictSchema ? colors.primary : '#f8fafc'}
                />
              </View>

              <View style={styles.optionRow}>
                <View style={styles.optionCopy}>
                  <Text style={styles.optionTitle}>安全保存 API Key</Text>
                  <Text style={styles.optionHint}>
                    {secureStorageAvailable
                      ? '默认关闭，仅保留在内存直到应用会话结束。'
                      : '当前构建未包含系统安全存储，仅支持本次会话。安装依赖并重新构建 App 后可启用。'}
                  </Text>
                </View>
                <Switch
                  value={persistSecurely}
                  onValueChange={setPersistSecurely}
                  disabled={busy || !secureStorageAvailable}
                  trackColor={{ false: '#cbd5e1', true: colors.primarySoft }}
                  thumbColor={persistSecurely ? colors.primary : '#f8fafc'}
                />
              </View>

              <Text style={styles.privacyNotice}>
                保存前会再次确认目标服务。使用助手时，当前代码、积木摘要和最近对话将发送给第三方模型服务。调用费用以服务商账单为准，取消不保证停止计费。系统安全存储无法防止已被攻破的设备提取
                Key；清除本地配置不等于撤销供应商凭据。
              </Text>
              {errorText ? (
                <Text style={styles.errorText}>{errorText}</Text>
              ) : null}
            </ScrollView>
          )}

          <View style={styles.actions}>
            <Pressable
              style={({ pressed }) => [
                styles.textAction,
                pressed && styles.pressed,
              ]}
              onPress={handleClear}
              accessibilityRole="button"
              accessibilityLabel="清除模型配置"
              disabled={busy}
            >
              <Text style={styles.dangerText}>清除</Text>
            </Pressable>
            <View style={styles.actionSpacer} />
            <Pressable
              style={({ pressed }) => [
                styles.secondaryButton,
                pressed && styles.pressed,
              ]}
              onPress={handleTest}
              accessibilityRole="button"
              accessibilityLabel="测试模型连接"
              disabled={busy}
            >
              {testing ? (
                <ActivityIndicator color={colors.primary} />
              ) : (
                <Text style={styles.secondaryText}>测试连接</Text>
              )}
            </Pressable>
            <Pressable
              style={({ pressed }) => [
                styles.primaryButton,
                pressed && styles.pressed,
                busy && styles.disabled,
              ]}
              onPress={handleSave}
              accessibilityRole="button"
              accessibilityLabel="保存模型配置"
              disabled={busy}
            >
              {saving ? (
                <ActivityIndicator color={colors.surface} />
              ) : (
                <Text style={styles.primaryText}>保存</Text>
              )}
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.48)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  card: {
    width: '100%',
    maxWidth: 680,
    maxHeight: '92%',
    borderRadius: 24,
    backgroundColor: colors.surface,
    padding: spacing.xl,
    ...shadows.primaryMd,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  headerCopy: { flex: 1 },
  title: {
    color: colors.ink,
    fontSize: fontSize.xl,
    fontWeight: fontWeight.black,
  },
  subtitle: { color: colors.textSubtle, fontSize: fontSize.sm, marginTop: 4 },
  closeButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
  },
  closeText: { color: colors.textMuted, fontSize: 30, lineHeight: 32 },
  loadingArea: {
    minHeight: 240,
    alignItems: 'center',
    justifyContent: 'center',
  },
  formScroll: { flexShrink: 1 },
  formContent: { paddingBottom: spacing.sm },
  label: {
    color: colors.ink,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    marginTop: spacing.sm,
    marginBottom: 6,
  },
  input: {
    minHeight: 46,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    backgroundColor: '#f8fafc',
    color: colors.ink,
    paddingHorizontal: spacing.sm,
    fontSize: fontSize.sm,
  },
  fieldHint: {
    color: '#b45309',
    fontSize: fontSize.xs,
    lineHeight: 18,
    marginTop: 5,
  },
  keyRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  keyInput: { flex: 1 },
  revealButton: {
    minHeight: 46,
    paddingHorizontal: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  revealText: {
    color: colors.primary,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingTop: spacing.lg,
  },
  optionCopy: { flex: 1 },
  optionTitle: {
    color: colors.ink,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
  },
  optionHint: {
    color: colors.textSubtle,
    fontSize: fontSize.xs,
    lineHeight: 18,
    marginTop: 3,
  },
  privacyNotice: {
    color: colors.textMuted,
    backgroundColor: '#eef2ff',
    borderRadius: 12,
    padding: spacing.sm,
    fontSize: fontSize.xs,
    lineHeight: 19,
    marginTop: spacing.lg,
  },
  errorText: {
    color: '#b91c1c',
    fontSize: fontSize.sm,
    lineHeight: 20,
    marginTop: spacing.sm,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#e2e8f0',
  },
  actionSpacer: { flex: 1 },
  textAction: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: spacing.xs,
  },
  dangerText: {
    color: '#b91c1c',
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
  },
  secondaryButton: {
    minWidth: 104,
    minHeight: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
  },
  secondaryText: {
    color: colors.primary,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
  },
  primaryButton: {
    minWidth: 88,
    minHeight: 44,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  primaryText: {
    color: colors.surface,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.extraBold,
  },
  pressed: { opacity: 0.7 },
  disabled: { opacity: 0.5 },
});
