import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  AppState,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import ReactNativeBlobUtil from 'react-native-blob-util';

import type { EditorInMessage, EditorOutMessage } from '@scratch-mobile/shared';
import type {
  AssistantUsage,
  GenerateAssistantCodeResult,
} from '../../services/assistant';
import {
  createDevelopmentCode,
  DEVELOPMENT_EXAMPLES,
  type DevelopmentExampleId,
} from './developmentExamples';
import {
  generateAssistantCode,
  getAssistantConnection,
} from '../../services/assistant';
import { compileGeneratedCode } from '../../services/pika';
import { colors, fontSize, fontWeight, shadows, spacing } from '../../theme';

export type AssistantPanelProps = {
  projectId: string;
  request: (message: EditorInMessage) => Promise<EditorOutMessage>;
  onClose: () => void;
  visible?: boolean;
  persistenceError?: string | null;
};

type ConversationItem = {
  id: string;
  role: 'user' | 'assistant' | 'status';
  content: string;
};

type CandidateState = {
  projectId: string;
  candidateId: string;
  sessionId: string;
  summary: string;
  originalCode: string;
  code: string;
  blockCount: number;
  usage?: AssistantUsage;
  compileOk: boolean;
  compileMessage: string;
};

type CheckpointState = {
  projectId: string;
  sessionId: string;
};

type Phase =
  | 'idle'
  | 'snapshot'
  | 'model'
  | 'prepare'
  | 'compile'
  | 'apply'
  | 'discard'
  | 'restore';

let requestSequence = 0;
function createRequestId(): string {
  requestSequence += 1;
  return `assistant-${Date.now().toString(36)}-${requestSequence.toString(36)}`;
}

function safeErrorMessage(error: unknown, apiKey = ''): string {
  let message =
    error instanceof Error ? error.message : '助手请求失败，请稍后重试。';
  if (apiKey) message = message.split(apiKey).join('••••••••');
  return message.replace(/Bearer\s+\S+/gi, 'Bearer ••••••••').slice(0, 400);
}

function proposalText(input: {
  assistantMessage: string;
  response: {
    message: string;
    assumptions: string[];
    questions: string[];
  };
}): string {
  const values = [
    input.response.message,
    input.response.assumptions.join('\n'),
    input.response.questions.length
      ? `需要确认：${input.response.questions.join('\n')}`
      : undefined,
    input.assistantMessage,
  ].filter((value): value is string => Boolean(value?.trim()));
  return [...new Set(values)].join('\n\n');
}

function usageText(usage?: AssistantUsage): string | null {
  if (!usage) return null;
  const values = [
    usage.promptTokens === undefined ? null : `输入 ${usage.promptTokens}`,
    usage.completionTokens === undefined
      ? null
      : `输出 ${usage.completionTokens}`,
    usage.totalTokens === undefined ? null : `合计 ${usage.totalTokens}`,
  ].filter((value): value is string => value !== null);
  return values.length > 0 ? `${values.join(' · ')} Token` : null;
}

function assertSnapshot(
  value: EditorOutMessage,
  requestId: string,
  projectId: string,
): Extract<EditorOutMessage, { type: 'editor.workspace.snapshot' }> {
  if (
    value.type !== 'editor.workspace.snapshot' ||
    value.requestId !== requestId ||
    value.projectId !== projectId
  ) {
    throw new Error('编辑器没有返回匹配的实时工作区快照。');
  }
  return value;
}

function assertCandidateReady(
  value: EditorOutMessage,
  requestId: string,
  projectId: string,
): Extract<EditorOutMessage, { type: 'editor.workspace.candidate.ready' }> {
  if (value.type === 'editor.workspace.candidate.rejected') {
    throw new Error(value.reason || '编辑器拒绝了该候选修改。');
  }
  if (
    value.type !== 'editor.workspace.candidate.ready' ||
    value.requestId !== requestId ||
    value.projectId !== projectId
  ) {
    throw new Error('编辑器没有返回匹配的候选工作区。');
  }
  return value;
}

function assertApplied(
  value: EditorOutMessage,
  requestId: string,
  projectId: string,
): Extract<EditorOutMessage, { type: 'editor.workspace.candidate.applied' }> {
  if (value.type === 'editor.workspace.candidate.rejected') {
    throw new Error(value.reason || '编辑器拒绝了该操作。');
  }
  if (
    value.type !== 'editor.workspace.candidate.applied' ||
    value.requestId !== requestId ||
    value.projectId !== projectId
  ) {
    throw new Error('编辑器没有确认操作结果。');
  }
  return value;
}

function CodePreview({ label, code }: { label: string; code: string }) {
  return (
    <View style={styles.codeSection}>
      <Text style={styles.codeLabel}>{label}</Text>
      <ScrollView
        horizontal
        nestedScrollEnabled
        style={styles.codeScroll}
        contentContainerStyle={styles.codeContent}
        showsHorizontalScrollIndicator
      >
        <Text selectable style={styles.codeText}>
          {code || '（无生成代码）'}
        </Text>
      </ScrollView>
    </View>
  );
}

export function AssistantPanel({
  projectId,
  request,
  onClose,
  visible = true,
  persistenceError,
}: AssistantPanelProps) {
  const [prompt, setPrompt] = useState('');
  const [messages, setMessages] = useState<ConversationItem[]>([]);
  const [phase, setPhase] = useState<Phase>('idle');
  const [errorText, setErrorText] = useState<string | null>(null);
  const [candidate, setCandidateState] = useState<CandidateState | null>(null);
  const [checkpoint, setCheckpoint] = useState<CheckpointState | null>(null);
  const operationRef = useRef(0);
  const busyRef = useRef(false);
  const committingRef = useRef(false);
  const networkControllerRef = useRef<AbortController | null>(null);
  const mountedRef = useRef(true);
  const candidateRef = useRef<CandidateState | null>(null);
  const messagesRef = useRef<ConversationItem[]>([]);
  const projectIdRef = useRef(projectId);

  const setCandidate = useCallback((next: CandidateState | null) => {
    candidateRef.current = next;
    setCandidateState(next);
  }, []);

  const appendMessage = useCallback((item: ConversationItem) => {
    messagesRef.current = [...messagesRef.current, item];
    setMessages(messagesRef.current);
  }, []);

  const discardCandidateSilently = useCallback(
    (staleCandidate: CandidateState | null) => {
      if (!staleCandidate || staleCandidate.projectId !== projectId) return;
      const discardRequestId = createRequestId();
      request({
        type: 'editor.workspace.candidate.discard',
        requestId: discardRequestId,
        projectId: staleCandidate.projectId,
        sessionId: staleCandidate.sessionId,
        candidateId: staleCandidate.candidateId,
      }).catch(() => undefined);
    },
    [projectId, request],
  );

  const invalidateWork = useCallback(
    (updateState: boolean, force = false) => {
      // Applying/restoring is a committed editor operation once the WebView
      // accepts it. Backgrounding or closing must not turn that operation into
      // a cancellation before its response arrives.
      if (!force && committingRef.current) return;
      committingRef.current = false;
      operationRef.current += 1;
      busyRef.current = false;
      networkControllerRef.current?.abort();
      networkControllerRef.current = null;
      const staleCandidate = candidateRef.current;
      candidateRef.current = null;
      discardCandidateSilently(staleCandidate);
      if (updateState) {
        setCandidateState(null);
        setPhase('idle');
      }
    },
    [discardCandidateSilently],
  );

  const invalidateWorkRef = useRef<
    (updateState: boolean, force?: boolean) => void
  >(() => undefined);
  invalidateWorkRef.current = invalidateWork;

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      invalidateWorkRef.current(false, true);
    };
  }, []);

  useEffect(() => {
    if (!visible) invalidateWork(true);
  }, [visible, invalidateWork]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', nextState => {
      if (nextState !== 'active') invalidateWork(true);
    });
    return () => subscription.remove();
  }, [invalidateWork]);

  useEffect(() => {
    if (projectIdRef.current === projectId) return;
    projectIdRef.current = projectId;
    invalidateWorkRef.current(true, true);
    messagesRef.current = [];
    setMessages([]);
    setPrompt('');
    setErrorText(null);
    setCheckpoint(null);
  }, [projectId]);

  const isCurrent = useCallback(
    (operation: number) =>
      mountedRef.current && operation === operationRef.current,
    [],
  );

  const handleGenerate = useCallback(
    async (exampleId?: DevelopmentExampleId) => {
      if (exampleId && !__DEV__) return;
      const example = DEVELOPMENT_EXAMPLES.find(item => item.id === exampleId);
      const trimmedPrompt = example
        ? `本地测试：${example.label}`
        : prompt.trim();
      if (
        !trimmedPrompt ||
        busyRef.current ||
        phase !== 'idle' ||
        candidateRef.current
      ) {
        return;
      }

      busyRef.current = true;
      const operation = ++operationRef.current;
      const userMessage: ConversationItem = {
        id: createRequestId(),
        role: exampleId ? 'status' : 'user',
        content: trimmedPrompt,
      };
      const priorConversation = messagesRef.current
        .filter(
          (item): item is ConversationItem & { role: 'user' | 'assistant' } =>
            item.role === 'user' || item.role === 'assistant',
        )
        .slice(-10)
        .map(item => ({ role: item.role, content: item.content }));

      appendMessage(userMessage);
      if (!exampleId) setPrompt('');
      setErrorText(null);
      setCandidate(null);
      setPhase('snapshot');

      let apiKey = '';
      try {
        const connection = exampleId ? null : await getAssistantConnection();
        if (!isCurrent(operation)) return;
        if (!exampleId && !connection) {
          throw new Error(
            '请先打开模型配置，填写 HTTPS 地址、模型名称和 API Key。',
          );
        }
        apiKey = connection?.apiKey ?? '';

        const snapshotRequestId = createRequestId();
        const snapshot = assertSnapshot(
          await request({
            type: 'editor.workspace.snapshot.request',
            requestId: snapshotRequestId,
            projectId,
          }),
          snapshotRequestId,
          projectId,
        );
        if (!isCurrent(operation)) return;

        let generated: GenerateAssistantCodeResult;
        if (exampleId) {
          generated = {
            response: createDevelopmentCode(exampleId),
            assistantMessage:
              '本地固定数据，不调用模型；仅预览和编译，不运行设备。',
          };
        } else {
          if (!connection) throw new Error('模型配置不可用。');
          const controller = new AbortController();
          networkControllerRef.current = controller;
          setPhase('model');
          generated = await generateAssistantCode({
            profile: connection.profile,
            apiKey: connection.apiKey,
            prompt: trimmedPrompt,
            conversation: priorConversation,
            context: {
              projectId,
              workspaceHash: snapshot.workspaceHash,
              generatedCode: snapshot.code,
              blocks: snapshot.blocks,
            },
            signal: controller.signal,
          });
        }
        if (!isCurrent(operation)) return;
        networkControllerRef.current = null;

        appendMessage({
          id: createRequestId(),
          role: exampleId ? 'status' : 'assistant',
          content: proposalText(generated),
        });

        if (generated.response.type !== 'code') {
          busyRef.current = false;
          setPhase('idle');
          return;
        }

        setPhase('prepare');
        let python = generated.response.python;
        let ready: Extract<
          EditorOutMessage,
          { type: 'editor.workspace.candidate.ready' }
        > | null = null;
        for (let attempt = 0; attempt < 3; attempt += 1) {
          const prepareRequestId = createRequestId();
          const prepared = await request({
            type: 'editor.workspace.candidate.prepare',
            requestId: prepareRequestId,
            projectId,
            source: { kind: 'python', python },
            sessionId: snapshot.sessionId,
            catalogVersion: snapshot.catalogVersion,
            baseWorkspaceHash: snapshot.workspaceHash,
          });
          if (!isCurrent(operation)) {
            if (prepared.type === 'editor.workspace.candidate.ready') {
              discardCandidateSilently({
                projectId,
                candidateId: prepared.candidateId,
                sessionId: prepared.sessionId,
                summary: generated.response.message,
                originalCode: snapshot.code,
                code: prepared.code,
                blockCount: prepared.blockCount,
                usage: generated.usage,
                compileOk: false,
                compileMessage: '',
              });
            }
            return;
          }
          if (prepared.type === 'editor.workspace.candidate.rejected') {
            if (exampleId || attempt === 2) {
              throw new Error(prepared.reason || '编辑器拒绝了该候选修改。');
            }
            if (!connection) throw new Error('模型配置不可用。');
            const controller = new AbortController();
            networkControllerRef.current = controller;
            setPhase('model');
            generated = await generateAssistantCode({
              profile: connection.profile,
              apiKey: connection.apiKey,
              prompt: trimmedPrompt,
              conversation: priorConversation,
              context: {
                projectId,
                workspaceHash: snapshot.workspaceHash,
                generatedCode: snapshot.code,
                blocks: snapshot.blocks,
              },
              repair: { python, error: prepared.reason },
              signal: controller.signal,
            });
            networkControllerRef.current = null;
            if (!isCurrent(operation)) return;
            if (generated.response.type !== 'code') {
              appendMessage({
                id: createRequestId(),
                role: 'assistant',
                content: proposalText(generated),
              });
              busyRef.current = false;
              setPhase('idle');
              return;
            }
            python = generated.response.python;
            setPhase('prepare');
            continue;
          }
          ready = assertCandidateReady(prepared, prepareRequestId, projectId);
          break;
        }
        if (!ready) throw new Error('编辑器没有返回匹配的候选工作区。');
        if (!isCurrent(operation)) {
          discardCandidateSilently({
            projectId,
            candidateId: ready.candidateId,
            sessionId: ready.sessionId,
            summary: generated.response.message,
            originalCode: snapshot.code,
            code: ready.code,
            blockCount: ready.blockCount,
            usage: generated.usage,
            compileOk: false,
            compileMessage: '',
          });
          return;
        }

        setPhase('compile');
        let compileOk = false;
        let compileMessage = '编译未完成。';
        let compileOutputPath: string | null = null;
        try {
          const safeProjectId = projectId
            .replace(/[^a-zA-Z0-9_-]/g, '_')
            .slice(0, 48);
          const safeCandidateId = ready.candidateId
            .replace(/[^a-zA-Z0-9_-]/g, '_')
            .slice(0, 48);
          compileOutputPath = `${ReactNativeBlobUtil.fs.dirs.CacheDir}/assistant-${safeProjectId}-${safeCandidateId}.py.o`;
          const outcome = await compileGeneratedCode(
            ready.code,
            compileOutputPath,
          );
          compileOk = outcome.ok;
          compileMessage = outcome.ok
            ? `编译通过（${outcome.bytecodeSize} 字节）。这里只验证代码，不会连接或上传到蓝牙设备。`
            : outcome.message || '候选代码编译失败。';
          if (
            !compileOk &&
            (ready.code.trim().length === 0 ||
              ready.code.trim().startsWith('# 拖拽飞出栏积木后生成 Python 代码'))
          ) {
            compileOk = true;
            compileMessage =
              '工作区将被清空。确认后才会移除积木，不会连接或上传到蓝牙设备。';
          }
        } catch (error) {
          compileMessage = `候选代码编译异常：${safeErrorMessage(error)}`;
        } finally {
          if (compileOutputPath) {
            await ReactNativeBlobUtil.fs
              .unlink(compileOutputPath)
              .catch(() => undefined);
          }
        }
        if (!isCurrent(operation)) {
          discardCandidateSilently({
            projectId,
            candidateId: ready.candidateId,
            sessionId: ready.sessionId,
            summary: generated.response.message,
            originalCode: snapshot.code,
            code: ready.code,
            blockCount: ready.blockCount,
            usage: generated.usage,
            compileOk,
            compileMessage,
          });
          return;
        }

        setCandidate({
          projectId,
          candidateId: ready.candidateId,
          sessionId: ready.sessionId,
          summary: generated.response.message,
          originalCode: snapshot.code,
          code: ready.code,
          blockCount: ready.blockCount,
          usage: generated.usage,
          compileOk,
          compileMessage,
        });
        busyRef.current = false;
        setPhase('idle');
      } catch (error) {
        if (!isCurrent(operation)) return;
        networkControllerRef.current = null;
        busyRef.current = false;
        setErrorText(safeErrorMessage(error, apiKey));
        setPhase('idle');
      }
    },
    [
      appendMessage,
      discardCandidateSilently,
      isCurrent,
      phase,
      projectId,
      prompt,
      request,
      setCandidate,
    ],
  );

  const handleCancel = useCallback(() => {
    invalidateWork(true);
    setErrorText(null);
    appendMessage({
      id: createRequestId(),
      role: 'status',
      content: '本次请求已取消。迟到的异步结果将被忽略。',
    });
  }, [appendMessage, invalidateWork]);

  const handleApply = useCallback(async () => {
    const current = candidateRef.current;
    if (!current?.compileOk || busyRef.current || phase !== 'idle') return;
    busyRef.current = true;
    const operation = ++operationRef.current;
    committingRef.current = true;
    // Keep a recovery action even if the acknowledgement is lost after apply.
    setCheckpoint({ projectId, sessionId: current.sessionId });
    setPhase('apply');
    setErrorText(null);
    try {
      const applyRequestId = createRequestId();
      assertApplied(
        await request({
          type: 'editor.workspace.candidate.apply',
          requestId: applyRequestId,
          projectId,
          sessionId: current.sessionId,
          candidateId: current.candidateId,
        }),
        applyRequestId,
        projectId,
      );
      if (!isCurrent(operation)) return;
      setCandidate(null);
      setCheckpoint({ projectId, sessionId: current.sessionId });
      appendMessage({
        id: createRequestId(),
        role: 'status',
        content:
          '候选已应用，并已安排自动保存；保存失败会在编辑器提示。应用会清空原撤销历史，请用检查点恢复。继续人工编辑后，恢复将被拒绝以保护后续修改。',
      });
      busyRef.current = false;
      setPhase('idle');
    } catch (error) {
      if (!isCurrent(operation)) return;
      busyRef.current = false;
      setErrorText(safeErrorMessage(error));
      setPhase('idle');
    } finally {
      if (isCurrent(operation)) committingRef.current = false;
    }
  }, [appendMessage, isCurrent, phase, projectId, request, setCandidate]);

  const handleDiscard = useCallback(async () => {
    const current = candidateRef.current;
    if (!current || busyRef.current || phase !== 'idle') return;
    busyRef.current = true;
    const operation = ++operationRef.current;
    setPhase('discard');
    setErrorText(null);
    try {
      await request({
        type: 'editor.workspace.candidate.discard',
        requestId: createRequestId(),
        projectId,
        sessionId: current.sessionId,
        candidateId: current.candidateId,
      });
      if (!isCurrent(operation)) return;
      setCandidate(null);
      appendMessage({
        id: createRequestId(),
        role: 'status',
        content: '候选修改已拒绝，编辑器原内容保持不变。',
      });
      busyRef.current = false;
      setPhase('idle');
    } catch (error) {
      if (!isCurrent(operation)) return;
      busyRef.current = false;
      setErrorText(safeErrorMessage(error));
      setPhase('idle');
    } finally {
      if (isCurrent(operation)) committingRef.current = false;
    }
  }, [appendMessage, isCurrent, phase, projectId, request, setCandidate]);

  const handleRestore = useCallback(async () => {
    if (
      !checkpoint ||
      checkpoint.projectId !== projectId ||
      busyRef.current ||
      phase !== 'idle'
    )
      return;
    busyRef.current = true;
    const operation = ++operationRef.current;
    committingRef.current = true;
    setPhase('restore');
    setErrorText(null);
    try {
      const restoreRequestId = createRequestId();
      assertApplied(
        await request({
          type: 'editor.workspace.candidate.restore',
          requestId: restoreRequestId,
          projectId,
          sessionId: checkpoint.sessionId,
        }),
        restoreRequestId,
        projectId,
      );
      if (!isCurrent(operation)) return;
      setCandidate(null);
      setCheckpoint(null);
      appendMessage({
        id: createRequestId(),
        role: 'status',
        content: '已恢复到应用前的显式检查点，并已安排自动保存。',
      });
      busyRef.current = false;
      setPhase('idle');
    } catch (error) {
      if (!isCurrent(operation)) return;
      busyRef.current = false;
      setErrorText(safeErrorMessage(error));
      setPhase('idle');
    } finally {
      if (isCurrent(operation)) committingRef.current = false;
    }
  }, [
    appendMessage,
    checkpoint,
    isCurrent,
    phase,
    projectId,
    request,
    setCandidate,
  ]);

  const handleClose = useCallback(() => {
    if (committingRef.current) return;
    invalidateWork(true);
    onClose();
  }, [invalidateWork, onClose]);

  const busy = phase !== 'idle';
  const phaseLabel: Record<Exclude<Phase, 'idle'>, string> = {
    snapshot: '正在读取实时工作区…',
    model: '模型正在生成提案…',
    prepare: '正在准备隔离候选…',
    compile: '正在编译验证候选代码…',
    apply: '正在应用候选…',
    discard: '正在拒绝候选…',
    restore: '正在恢复检查点…',
  };
  const tokenUsage = usageText(candidate?.usage);

  return (
    <Modal
      visible={visible}
      onRequestClose={handleClose}
      animationType="slide"
      supportedOrientations={['portrait', 'landscape']}
    >
      <KeyboardAvoidingView
        style={styles.panel}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.header}>
          <View style={styles.headerCopy}>
            <Text style={styles.title}>积木助手</Text>
            <Text style={styles.subtitle}>
              本轮对话仅保存在内存，关闭面板仍可继续；离开作品后清除。
            </Text>
          </View>
          <Pressable
            onPress={handleClose}
            disabled={busy}
            style={[styles.closeButton, busy && styles.disabled]}
            accessibilityRole="button"
            accessibilityLabel="关闭积木助手"
          >
            <Text style={styles.closeText}>×</Text>
          </Pressable>
        </View>

        <View style={styles.notice}>
          <Text style={styles.noticeText}>
            发送时，当前代码、积木摘要、作品标识和最近对话会交给你配置的第三方模型服务。模型响应不会被自动修复。
          </Text>
        </View>

        {persistenceError ? (
          <View style={styles.errorBox} accessibilityRole="alert">
            <Text style={styles.errorText}>
              {persistenceError}{' '}
              当前编辑内容和检查点仍在内存中，请勿离开或重载作品；可先恢复检查点，再重试保存。
            </Text>
          </View>
        ) : null}

        <ScrollView
          style={styles.chatScroll}
          contentContainerStyle={styles.chatContent}
          keyboardShouldPersistTaps="handled"
          nestedScrollEnabled
          showsVerticalScrollIndicator
        >
          {messages.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>
                描述你想创建、修改或解释的程序
              </Text>
              <Text style={styles.emptyText}>
                助手会先取得编辑器的实时快照，再生成可审阅的候选；只有编译通过后才能接受。
              </Text>
            </View>
          ) : null}
          {messages.map(message => (
            <View
              key={message.id}
              style={[
                styles.message,
                message.role === 'user'
                  ? styles.userMessage
                  : message.role === 'assistant'
                  ? styles.assistantMessage
                  : styles.statusMessage,
              ]}
            >
              <Text style={styles.messageRole}>
                {message.role === 'user'
                  ? '你'
                  : message.role === 'assistant'
                  ? '助手'
                  : '状态'}
              </Text>
              <Text
                selectable
                style={[
                  styles.messageText,
                  message.role === 'user' && styles.userMessageText,
                ]}
              >
                {message.content}
              </Text>
            </View>
          ))}

          {candidate ? (
            <View style={styles.candidateCard}>
              <Text style={styles.candidateTitle}>待审阅候选</Text>
              <Text selectable style={styles.summary}>
                {candidate.summary}
              </Text>
              <Text style={styles.meta}>
                新程序共 {candidate.blockCount} 个积木
                {tokenUsage ? ` · ${tokenUsage}` : ''}
              </Text>
              <CodePreview label="原代码" code={candidate.originalCode} />
              <CodePreview label="候选代码" code={candidate.code} />
              <Text
                style={[
                  styles.compileText,
                  !candidate.compileOk && styles.compileError,
                ]}
              >
                {candidate.compileMessage}
              </Text>
              <Text style={styles.meta}>
                接受会清空原撤销历史；可在继续人工编辑前使用检查点恢复。离开作品或重载编辑器后，内存恢复点失效。
              </Text>
              <View style={styles.candidateActions}>
                <Pressable
                  style={({ pressed }) => [
                    styles.secondaryButton,
                    pressed && styles.pressed,
                  ]}
                  onPress={handleDiscard}
                  disabled={busy}
                  accessibilityRole="button"
                  accessibilityLabel="拒绝候选修改"
                >
                  <Text style={styles.secondaryText}>拒绝</Text>
                </Pressable>
                <Pressable
                  style={({ pressed }) => [
                    styles.primaryButton,
                    pressed && styles.pressed,
                    (!candidate.compileOk || busy) && styles.disabled,
                  ]}
                  onPress={handleApply}
                  disabled={!candidate.compileOk || busy}
                  accessibilityRole="button"
                  accessibilityLabel="接受并应用候选修改"
                >
                  <Text style={styles.primaryText}>接受并应用</Text>
                </Pressable>
              </View>
            </View>
          ) : null}

          {errorText ? (
            <View style={styles.errorBox}>
              <Text selectable style={styles.errorText}>
                {errorText}
              </Text>
            </View>
          ) : null}
          {__DEV__ ? (
            <View style={styles.developmentTools}>
              <Text style={styles.developmentTitle}>开发测试（不调用模型）</Text>
              <View style={styles.developmentActions}>
                {DEVELOPMENT_EXAMPLES.map(example => (
                  <Pressable
                    key={example.id}
                    onPress={() => handleGenerate(example.id)}
                    disabled={busy || Boolean(candidate)}
                    accessibilityRole="button"
                    accessibilityLabel={`运行${example.label}`}
                    style={[
                      styles.secondaryButton,
                      (busy || Boolean(candidate)) && styles.disabled,
                    ]}
                  >
                    <Text style={styles.secondaryText}>{example.label}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          ) : null}
        </ScrollView>

        {busy ? (
          <View style={styles.progressRow}>
            <ActivityIndicator color={colors.primary} />
            <Text style={styles.progressText}>
              {phaseLabel[phase as Exclude<Phase, 'idle'>]}
            </Text>
            {phase === 'snapshot' ||
            phase === 'model' ||
            phase === 'prepare' ||
            phase === 'compile' ? (
              <Pressable
                onPress={handleCancel}
                accessibilityLabel="取消"
                style={styles.cancelButton}
              >
                <Text style={styles.cancelText}>取消</Text>
              </Pressable>
            ) : null}
          </View>
        ) : null}

        {checkpoint ? (
          <Pressable
            style={({ pressed }) => [
              styles.restoreButton,
              pressed && styles.pressed,
            ]}
            onPress={handleRestore}
            disabled={busy}
            accessibilityRole="button"
            accessibilityLabel="恢复应用前检查点"
          >
            <Text style={styles.restoreText}>恢复应用前检查点</Text>
          </Pressable>
        ) : null}

        <View style={styles.composer}>
          <TextInput
            value={prompt}
            onChangeText={setPrompt}
            style={styles.promptInput}
            placeholder="例如：让底盘前进 2 秒后停止"
            placeholderTextColor={colors.textFaint}
            multiline
            maxLength={4000}
            editable={!busy && !candidate}
          />
          <Pressable
            style={({ pressed }) => [
              styles.sendButton,
              pressed && styles.pressed,
              (!prompt.trim() || busy || Boolean(candidate)) && styles.disabled,
            ]}
            onPress={() => handleGenerate()}
            disabled={!prompt.trim() || busy || Boolean(candidate)}
            accessibilityRole="button"
            accessibilityLabel="发送给积木助手"
          >
            <Text style={styles.sendText}>发送</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  panel: {
    flex: 1,
    minWidth: 280,
    backgroundColor: colors.background,
    padding: spacing.md,
  },
  developmentTools: { paddingVertical: spacing.sm, gap: spacing.xs },
  developmentTitle: { color: colors.textSubtle, fontSize: fontSize.xs },
  developmentActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  headerCopy: { flex: 1 },
  title: {
    color: colors.ink,
    fontSize: fontSize.xl,
    fontWeight: fontWeight.black,
  },
  subtitle: {
    color: colors.textSubtle,
    fontSize: fontSize.xs,
    lineHeight: 18,
    marginTop: 3,
  },
  closeButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeText: { color: colors.textMuted, fontSize: 30, lineHeight: 32 },
  notice: {
    backgroundColor: '#e0e7ff',
    borderRadius: 12,
    padding: spacing.sm,
    marginVertical: spacing.sm,
  },
  noticeText: { color: '#3730a3', fontSize: fontSize.xs, lineHeight: 18 },
  chatScroll: { flex: 1 },
  chatContent: { flexGrow: 1, gap: spacing.sm, paddingBottom: spacing.md },
  emptyState: {
    flex: 1,
    minHeight: 150,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing['2xl'],
  },
  emptyTitle: {
    color: colors.ink,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.extraBold,
    textAlign: 'center',
  },
  emptyText: {
    color: colors.textSubtle,
    fontSize: fontSize.sm,
    lineHeight: 21,
    textAlign: 'center',
    marginTop: spacing.xs,
    maxWidth: 500,
  },
  message: { maxWidth: '92%', borderRadius: 16, padding: spacing.sm },
  userMessage: { alignSelf: 'flex-end', backgroundColor: colors.primary },
  assistantMessage: {
    alignSelf: 'flex-start',
    backgroundColor: colors.surface,
    ...shadows.primarySmall,
  },
  statusMessage: {
    alignSelf: 'center',
    maxWidth: '100%',
    backgroundColor: '#e2e8f0',
  },
  messageRole: {
    color: colors.textFaint,
    fontSize: 11,
    fontWeight: fontWeight.bold,
    marginBottom: 4,
  },
  messageText: { color: colors.ink, fontSize: fontSize.sm, lineHeight: 21 },
  userMessageText: { color: colors.surface },
  candidateCard: {
    backgroundColor: colors.surface,
    borderRadius: 18,
    padding: spacing.md,
    gap: spacing.xs,
    ...shadows.primarySmall,
  },
  candidateTitle: {
    color: colors.primary,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.black,
  },
  summary: { color: colors.ink, fontSize: fontSize.sm, lineHeight: 21 },
  meta: { color: colors.textSubtle, fontSize: fontSize.xs, lineHeight: 18 },
  codeSection: { marginTop: spacing.xs },
  codeLabel: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    marginBottom: 5,
  },
  codeScroll: {
    maxHeight: 180,
    borderRadius: 10,
    backgroundColor: colors.codeBackground,
  },
  codeContent: { padding: spacing.sm, minWidth: '100%' },
  codeText: {
    color: colors.codeText,
    fontSize: 12,
    lineHeight: 18,
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace' }),
  },
  compileText: {
    color: '#166534',
    fontSize: fontSize.xs,
    lineHeight: 18,
    marginTop: spacing.xs,
  },
  compileError: { color: '#b91c1c' },
  candidateActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  secondaryButton: {
    minHeight: 42,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.primarySoft,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryText: {
    color: colors.primary,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
  },
  primaryButton: {
    minHeight: 42,
    borderRadius: 12,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryText: {
    color: colors.surface,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.extraBold,
  },
  errorBox: {
    borderRadius: 12,
    backgroundColor: '#fee2e2',
    padding: spacing.sm,
  },
  errorText: { color: '#991b1b', fontSize: fontSize.sm, lineHeight: 20 },
  progressRow: {
    minHeight: 42,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  progressText: { flex: 1, color: colors.textMuted, fontSize: fontSize.xs },
  cancelButton: {
    minHeight: 38,
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
  },
  cancelText: {
    color: '#b91c1c',
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
  },
  restoreButton: {
    minHeight: 42,
    borderRadius: 12,
    backgroundColor: '#fef3c7',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  restoreText: {
    color: '#92400e',
    fontSize: fontSize.sm,
    fontWeight: fontWeight.extraBold,
  },
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.xs,
    paddingTop: spacing.xs,
  },
  promptInput: {
    flex: 1,
    minHeight: 46,
    maxHeight: 120,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    backgroundColor: colors.surface,
    color: colors.ink,
    fontSize: fontSize.sm,
    lineHeight: 20,
    paddingHorizontal: spacing.sm,
    paddingVertical: 11,
  },
  sendButton: {
    minWidth: 64,
    minHeight: 46,
    borderRadius: 14,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
  },
  sendText: {
    color: colors.surface,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.extraBold,
  },
  pressed: { opacity: 0.72 },
  disabled: { opacity: 0.42 },
});
