import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  AppState,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Switch,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { type NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { type RootStackParamList } from '../../app/navigation';
import {
  activateAssistantConnection,
  deleteAssistantConnection,
  generateAssistantProposal,
  isAssistantSecureStorageAvailable,
  listAssistantConnections,
  normalizeAssistantBaseUrl,
  saveAssistantConnection,
  type AssistantConnectionProfile,
  type AssistantConnectionRecord,
} from '../../services/assistant';
import { colors, spacing } from '../../theme';
import backIcon from '../../../assets/settingScreen/back.png';
import { CheckIcon, PencilIcon, PlayIcon, TrashIcon } from './AiSettingsIcons';
import { styles } from './AiSettingsScreen.styles';

type Props = NativeStackScreenProps<RootStackParamList, 'AiSettings'>;

const DEFAULT_BASE_URL = 'https://api.openai.com/v1';

function createProfileId(): string {
  return `p-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function modelInitial(model: string): string {
  const trimmed = model.trim();
  return trimmed ? trimmed.slice(0, 1).toUpperCase() : 'A';
}

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

export function AiSettingsScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;

  const [baseUrl, setBaseUrl] = useState(DEFAULT_BASE_URL);
  const [model, setModel] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [strictSchema, setStrictSchema] = useState(true);
  const [persistSecurely, setPersistSecurely] = useState(false);
  const secureStorageAvailable = isAssistantSecureStorageAvailable();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);
  const [profiles, setProfiles] = useState<AssistantConnectionRecord[]>([]);
  const [editorOpen, setEditorOpen] = useState(false);

  const profileIdRef = useRef(createProfileId());
  const originalBaseUrlRef = useRef(DEFAULT_BASE_URL);
  const addressClearedKeyRef = useRef(false);
  const operationRef = useRef(0);
  const actionRef = useRef<'save' | 'test' | 'delete' | 'activate' | null>(null);
  const testControllerRef = useRef<AbortController | null>(null);
  const mountedRef = useRef(true);
  const mutationInFlightRef = useRef(false);

  const safeAreaPadding = useMemo(
    () => ({
      paddingTop: Math.max(insets.top, spacing.lg),
      paddingBottom: Math.max(insets.bottom, spacing.lg),
      paddingLeft: Math.max(insets.left, spacing.lg),
      paddingRight: Math.max(insets.right, spacing.lg),
    }),
    [insets.bottom, insets.left, insets.right, insets.top],
  );

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
    const operation = ++operationRef.current;
    setLoading(true);
    setErrorText(null);
    setPersistSecurely(false);
    setShowApiKey(false);
    addressClearedKeyRef.current = false;

    listAssistantConnections()
      .then(records => {
        if (!mountedRef.current || operation !== operationRef.current) return;
        setProfiles(records);
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
  }, []);

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
      setProfiles(await listAssistantConnections());
      setEditorOpen(false);
      setShowApiKey(false);
      Alert.alert(
        '配置已保存',
        persistSecurely
          ? '已安全保存连接配置。'
          : '配置仅在本次应用会话中有效。',
      );
    } catch (error) {
      if (mountedRef.current && operation === operationRef.current) {
        setErrorText(safeErrorMessage(error, apiKey));
      }
    } finally {
      mutationInFlightRef.current = false;
      actionRef.current = null;
      if (mountedRef.current) setSaving(false);
    }
  }, [apiKey, baseUrl, loading, makeProfile, model, persistSecurely, saving, testing]);

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

  const handleCancelTest = useCallback(() => {
    stopTest(true);
  }, [stopTest]);

  const refreshProfiles = useCallback(async () => {
    setProfiles(await listAssistantConnections());
  }, []);

  const openEditor = useCallback((record: AssistantConnectionRecord | null) => {
    if (actionRef.current || saving || testing) return;
    const nextBaseUrl = record?.profile.baseUrl ?? DEFAULT_BASE_URL;
    profileIdRef.current = record?.profile.id ?? createProfileId();
    originalBaseUrlRef.current = nextBaseUrl;
    addressClearedKeyRef.current = false;
    setBaseUrl(nextBaseUrl);
    setModel(record?.profile.model ?? '');
    setApiKey(record?.apiKey ?? '');
    setShowApiKey(false);
    setStrictSchema(record ? record.profile.supportsJsonSchema !== false : true);
    setPersistSecurely(Boolean(record?.persisted) && secureStorageAvailable);
    setErrorText(null);
    setEditorOpen(true);
  }, [saving, secureStorageAvailable, testing]);

  const closeEditor = useCallback(() => {
    if (saving) return;
    stopTest(true);
    operationRef.current += 1;
    actionRef.current = null;
    setApiKey('');
    setShowApiKey(false);
    setEditorOpen(false);
  }, [saving, stopTest]);

  const handleActivate = useCallback(async (record: AssistantConnectionRecord) => {
    if (record.active || actionRef.current || saving || testing || loading) return;
    actionRef.current = 'activate';
    setErrorText(null);
    try {
      await activateAssistantConnection(record.profile.id);
      if (!mountedRef.current) return;
      await refreshProfiles();
    } catch (error) {
      if (mountedRef.current) setErrorText(safeErrorMessage(error, record.apiKey));
    } finally {
      actionRef.current = null;
    }
  }, [loading, refreshProfiles, saving, testing]);

  const handleDelete = useCallback(async (record: AssistantConnectionRecord) => {
    if (actionRef.current || saving || testing || loading) return;
    actionRef.current = 'delete';
    const operation = ++operationRef.current;
    const confirmed = await confirmAction(
      '删除模型配置',
      `将删除「${record.profile.model}」。本机保存的 API Key 会一并移除，这不会撤销服务商侧的密钥。`,
      '删除',
    );
    if (!mountedRef.current || operation !== operationRef.current) return;
    if (!confirmed || actionRef.current !== 'delete') {
      actionRef.current = null;
      return;
    }

    mutationInFlightRef.current = true;
    setSaving(true);
    setErrorText(null);
    try {
      await deleteAssistantConnection(record.profile.id);
      if (!mountedRef.current || operation !== operationRef.current) return;
      if (profileIdRef.current === record.profile.id) setEditorOpen(false);
      await refreshProfiles();
    } catch (error) {
      if (mountedRef.current && operation === operationRef.current) {
        setErrorText(safeErrorMessage(error, record.apiKey));
      }
    } finally {
      mutationInFlightRef.current = false;
      actionRef.current = null;
      if (mountedRef.current) setSaving(false);
    }
  }, [loading, refreshProfiles, saving, testing]);

  const handleBack = useCallback(() => {
    if (saving) return;
    stopTest(true);
    operationRef.current += 1;
    actionRef.current = null;
    setApiKey('');
    setShowApiKey(false);
    navigation.goBack();
  }, [navigation, saving, stopTest]);

  const busy = loading || saving || testing;

  return (
    <View style={[styles.container, safeAreaPadding]}>
      <View style={styles.header}>
        <Pressable
          style={({ pressed }) => [
            styles.backButton,
            pressed && styles.pressed,
            saving && styles.disabled,
          ]}
          onPress={handleBack}
          disabled={saving}
          accessibilityRole="button"
          accessibilityLabel="返回首页"
        >
          <Image source={backIcon} style={styles.backIcon} />
        </Pressable>
        <View style={styles.headerCopy}>
          <Text style={styles.headerTitle}>模型接口</Text>
          <Text style={styles.headerSubtitle}>
            蓝色边框可以启用，灰色边框是当前正在使用的模型
          </Text>
        </View>
        <Pressable
          style={({ pressed }) => [
            styles.addButton,
            pressed && styles.pressed,
            busy && styles.disabled,
          ]}
          onPress={() => openEditor(null)}
          disabled={busy}
          accessibilityRole="button"
          accessibilityLabel="添加模型"
        >
          <Text style={styles.addButtonText}>添加</Text>
        </Pressable>
      </View>

      {loading ? (
        <View style={styles.loadingArea}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[
            styles.scrollContent,
            isLandscape ? { justifyContent: 'flex-start' } : null,
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.contentColumn}>
            {errorText && !editorOpen ? (
              <Text style={styles.errorText}>{errorText}</Text>
            ) : null}
            {profiles.length === 0 ? (
              <View style={[styles.providerCard, styles.providerCardActive]}>
                <View style={styles.providerCopy}>
                  <Text style={styles.providerTitle}>还没有模型接口</Text>
                  <Text style={styles.providerUrl}>
                    点右上角「添加」，填写 HTTPS 地址、模型名称和 API Key
                  </Text>
                </View>
              </View>
            ) : (
              profiles.map(record => (
                <View
                  key={record.profile.id}
                  style={[
                    styles.providerCard,
                    record.active ? styles.providerCardActive : styles.providerCardIdle,
                  ]}
                >
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>
                      {modelInitial(record.profile.model)}
                    </Text>
                  </View>
                  <View style={styles.providerCopy}>
                    <Text style={styles.providerTitle} numberOfLines={1}>
                      {record.profile.model}
                    </Text>
                    <Text style={styles.providerUrl} numberOfLines={1}>
                      {record.profile.baseUrl}
                    </Text>
                  </View>
                  <View style={styles.providerActions}>
                    {record.active ? (
                      <View
                        style={styles.inUseChip}
                        accessibilityLabel={`${record.profile.model} 使用中`}
                      >
                        <CheckIcon color="#6b7280" />
                        <Text style={styles.inUseText}>使用中</Text>
                      </View>
                    ) : (
                      <Pressable
                        style={({ pressed }) => [
                          styles.startButton,
                          pressed && styles.pressed,
                          busy && styles.disabled,
                        ]}
                        onPress={() => handleActivate(record)}
                        disabled={busy}
                        accessibilityRole="button"
                        accessibilityLabel={`启用 ${record.profile.model}`}
                      >
                        <PlayIcon color={colors.surface} />
                        <Text style={styles.startText}>启用</Text>
                      </Pressable>
                    )}
                    <Pressable
                      style={({ pressed }) => [
                        styles.iconButton,
                        pressed && styles.pressed,
                        busy && styles.disabled,
                      ]}
                      onPress={() => openEditor(record)}
                      disabled={busy}
                      accessibilityRole="button"
                      accessibilityLabel={`编辑 ${record.profile.model}`}
                    >
                      <PencilIcon color="#4b5563" />
                    </Pressable>
                    <Pressable
                      style={({ pressed }) => [
                        styles.iconButton,
                        pressed && styles.pressed,
                        busy && styles.disabled,
                      ]}
                      onPress={() => handleDelete(record)}
                      disabled={busy}
                      accessibilityRole="button"
                      accessibilityLabel={`删除 ${record.profile.model}`}
                    >
                      <TrashIcon color="#4b5563" />
                    </Pressable>
                  </View>
                </View>
              ))
            )}
          </View>
        </ScrollView>
      )}

      {editorOpen ? (
        <View style={styles.editorBackdrop}>
          <KeyboardAvoidingView
            style={styles.editorWrap}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          >
            <ScrollView
              style={styles.editorScroll}
              contentContainerStyle={styles.editorScrollContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.editorCard}>
                <View style={styles.editorHeader}>
                  <Text style={styles.cardTitle}>配置模型</Text>
                  <Pressable
                    onPress={closeEditor}
                    disabled={saving}
                    accessibilityRole="button"
                    accessibilityLabel="关闭模型配置"
                  >
                    <Text style={styles.secondaryText}>关闭</Text>
                  </Pressable>
                </View>
                <Text style={styles.cardHint}>
                  地址需以 https:// 开头，并指向带 /v1 的 OpenAI 兼容网关。
                </Text>
                <Text style={styles.label}>接口地址</Text>
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
                    style={({ pressed }) => [
                      styles.revealButton,
                      pressed && styles.pressed,
                      busy && styles.disabled,
                    ]}
                    onPress={() => setShowApiKey(current => !current)}
                    disabled={busy}
                    accessibilityRole="button"
                    accessibilityLabel={showApiKey ? '隐藏 API Key' : '显示 API Key'}
                  >
                    <Text style={styles.revealText}>{showApiKey ? '隐藏' : '显示'}</Text>
                  </Pressable>
                </View>
                <View style={[styles.optionRow, styles.optionRowFirst]}>
                  <View style={styles.optionCopy}>
                    <Text style={styles.optionTitle}>严格 JSON Schema</Text>
                    <Text style={styles.optionHint}>
                      关闭后只要求返回 JSON 对象，不再约束字段结构。
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
                        : '当前构建未包含系统安全存储，仅支持本次会话。'}
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
                {errorText ? <Text style={styles.errorText}>{errorText}</Text> : null}
                <View style={styles.actionsRow}>
                  <View style={styles.actionSpacer} />
                  {testing ? (
                    <Pressable
                      style={({ pressed }) => [
                        styles.secondaryButton,
                        pressed && styles.pressed,
                      ]}
                      onPress={handleCancelTest}
                      accessibilityRole="button"
                      accessibilityLabel="取消测试连接"
                    >
                      <Text style={styles.secondaryText}>取消测试</Text>
                    </Pressable>
                  ) : (
                    <Pressable
                      style={({ pressed }) => [
                        styles.secondaryButton,
                        pressed && styles.pressed,
                        busy && styles.disabled,
                      ]}
                      onPress={handleTest}
                      accessibilityRole="button"
                      accessibilityLabel="测试模型连接"
                      disabled={busy}
                    >
                      <Text style={styles.secondaryText}>测试连接</Text>
                    </Pressable>
                  )}
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
            </ScrollView>
          </KeyboardAvoidingView>
        </View>
      ) : null}
    </View>
  );
}
