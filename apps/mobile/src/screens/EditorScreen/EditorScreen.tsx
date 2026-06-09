import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  Image,
  ScrollView,
  View,
  Text,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';

import type {
  EditorOutMessage,
  RnHandleShankOpenMessage,
  RnMatrixLightOpenMessage,
  RnNotePickerOpenMessage,
  RnNumberSliderOpenMessage,
  RnPortPickerOpenMessage,
  RnVariablePromptOpenMessage,
} from '@scratch-mobile/shared';
import {
  EDITOR_BUNDLE_HTML,
  HandleShankPickerOverlay,
  injectEditorMessage,
  MatrixLightOverlay,
  NotePickerOverlay,
  NumberSliderOverlay,
  PortPickerOverlay,
  resetInjectEditorMessageDedup,
  VariablePromptOverlay,
} from '../../features/editor';
import {
  compileGeneratedCode,
  runCompiledBytecode,
  runGeneratedCode,
} from '../../services/pika';
import { styles, pikaActionStyles } from './EditorScreen.styles';
import HomeIcon from '../../../assets/editorScreen/home.png';
import CodeViewIcon from '../../../assets/editorScreen/codeView.png';

type PikaActionState = 'idle' | 'compiling' | 'running';

function formatPikaStatus(
  action: PikaActionState,
  feedback: 'compile' | 'run' | 'idle',
  message: string,
  bytecodeSize: number | null,
  hexPreview: string,
): string {
  if (action === 'compiling') {
    return '正在编译…';
  }
  if (action === 'running') {
    return '正在运行…';
  }
  if (feedback === 'run' || feedback === 'idle') {
    return message || '等待编译';
  }
  if (bytecodeSize != null && bytecodeSize > 0) {
    const preview = hexPreview ? `，前缀 ${hexPreview}` : '';
    return `编译成功：${bytecodeSize} 字节${preview}`;
  }
  return message || '等待编译';
}

function parseEditorOutMessage(raw: string): EditorOutMessage | null {
  try {
    return JSON.parse(raw) as EditorOutMessage;
  } catch {
    return null;
  }
}

export function EditorScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const webViewRef = useRef<WebView>(null);
  const lastCodeRef = useRef({ code: '', blockCount: 0 });
  //存储当前激活的数字滑块会话
  const [rnSliderSession, setRnSliderSession] =
    useState<RnNumberSliderOpenMessage | null>(null);
  const [rnPortPickerSession, setRnPortPickerSession] =
    useState<RnPortPickerOpenMessage | null>(null);
  const [rnMatrixLightSession, setRnMatrixLightSession] =
    useState<RnMatrixLightOpenMessage | null>(null);
  const [rnNotePickerSession, setRnNotePickerSession] =
    useState<RnNotePickerOpenMessage | null>(null);
  const [rnHandleShankSession, setRnHandleShankSession] =
    useState<RnHandleShankOpenMessage | null>(null);
  const [rnVariablePromptSession, setRnVariablePromptSession] =
    useState<RnVariablePromptOpenMessage | null>(null);
  //存储生成的代码
  const [generatedCode, setGeneratedCode] = useState('// 等待编辑器生成代码');
  //存储积木数量
  const [blockCount, setBlockCount] = useState(0);
  //存储代码面板是否打开
  const [isCodePanelOpen, setIsCodePanelOpen] = useState(false);
  const [pikaAction, setPikaAction] = useState<PikaActionState>('idle');
  const [pikaStatusMessage, setPikaStatusMessage] = useState('等待编译');
  const [pikaStatusKind, setPikaStatusKind] = useState<
    'idle' | 'success' | 'error'
  >('idle');
  const [bytecodePath, setBytecodePath] = useState<string | null>(null);
  const [bytecodeSize, setBytecodeSize] = useState<number | null>(null);
  const [bytecodeHexPreview, setBytecodeHexPreview] = useState('');
  const [pikaFeedback, setPikaFeedback] = useState<'compile' | 'run' | 'idle'>(
    'idle',
  );

  useEffect(() => {
    setBytecodePath(null);
    setBytecodeSize(null);
    setBytecodeHexPreview('');
    setPikaStatusKind('idle');
    setPikaStatusMessage('代码已更新，请重新编译');
    setPikaFeedback('idle');
  }, [generatedCode]);

  //处理WebView发送的消息
  const handleEditorMessage = useCallback((message: EditorOutMessage) => {
    switch (message.type) {
      case 'editor.code.generated': {
        const { code: nextCode, blockCount: nextBlockCount } = message;
        if (
          lastCodeRef.current.code === nextCode &&
          lastCodeRef.current.blockCount === nextBlockCount
        ) {
          return;
        }
        lastCodeRef.current = { code: nextCode, blockCount: nextBlockCount };
        setGeneratedCode(nextCode);
        setBlockCount(nextBlockCount);
        return;
      }
      case 'editor.numberSlider.open':
        setRnSliderSession(current =>
          current?.sessionId === message.sessionId ? current : message,
        );
        return;
      case 'editor.numberSlider.close':
        setRnSliderSession(current =>
          current?.sessionId === message.sessionId ? null : current,
        );
        return;
      case 'editor.portPicker.open':
        setRnPortPickerSession(current =>
          current?.sessionId === message.sessionId ? current : message,
        );
        return;
      case 'editor.portPicker.close':
        setRnPortPickerSession(current =>
          current?.sessionId === message.sessionId ? null : current,
        );
        return;
      case 'editor.matrixLight.open':
        setRnMatrixLightSession(current => {
          if (
            current?.sessionId === message.sessionId &&
            current.rows === message.rows
          ) {
            return current;
          }
          return message;
        });
        return;
      case 'editor.matrixLight.close':
        setRnMatrixLightSession(current =>
          current?.sessionId === message.sessionId ? null : current,
        );
        return;
      case 'editor.notePicker.open':
        setRnNotePickerSession(current =>
          current?.sessionId === message.sessionId &&
          current.value === message.value
            ? current
            : message,
        );
        return;
      case 'editor.notePicker.close':
        setRnNotePickerSession(current =>
          current?.sessionId === message.sessionId ? null : current,
        );
        return;
      case 'editor.handleShank.open':
        setRnHandleShankSession(current =>
          current?.sessionId === message.sessionId ? current : message,
        );
        return;
      case 'editor.handleShank.close':
        setRnHandleShankSession(current =>
          current?.sessionId === message.sessionId ? null : current,
        );
        return;
      case 'editor.variablePrompt.open':
        setRnVariablePromptSession(current =>
          current?.sessionId === message.sessionId ? current : message,
        );
        return;
      case 'editor.variablePrompt.close':
        setRnVariablePromptSession(current =>
          current?.sessionId === message.sessionId ? null : current,
        );
        return;
    }
  }, []);

  const handleMessage = useCallback(
    (event: WebViewMessageEvent) => {
      const message = parseEditorOutMessage(event.nativeEvent.data);
      if (message) {
        handleEditorMessage(message);
        return;
      }

      // 兼容早期 editor 直接 post 代码字符串的调试路径。
      setGeneratedCode(event.nativeEvent.data);
      setBlockCount(0);
    },
    [handleEditorMessage],
  );

  const handleCompile = useCallback(async () => {
    setPikaAction('compiling');
    setPikaStatusKind('idle');
    setPikaStatusMessage('正在编译…');
    try {
      const outcome = await compileGeneratedCode(generatedCode);
      setPikaStatusKind(outcome.ok ? 'success' : 'error');
      setPikaStatusMessage(outcome.message);
      setBytecodePath(outcome.bytecodePath);
      setBytecodeSize(outcome.ok ? outcome.bytecodeSize : null);
      setBytecodeHexPreview(outcome.ok ? outcome.hexPreview : '');
      setPikaFeedback(outcome.ok ? 'compile' : 'idle');
    } catch (error) {
      setPikaStatusKind('error');
      setPikaStatusMessage(
        error instanceof Error ? error.message : '编译失败',
      );
      setBytecodePath(null);
      setBytecodeSize(null);
      setBytecodeHexPreview('');
      setPikaFeedback('idle');
    } finally {
      setPikaAction('idle');
    }
  }, [generatedCode]);

  const handleRunSource = useCallback(async () => {
    setPikaAction('running');
    setPikaStatusKind('idle');
    setPikaStatusMessage('正在运行源码…');
    setPikaFeedback('run');
    try {
      const outcome = await runGeneratedCode(generatedCode);
      setPikaStatusKind(outcome.ok ? 'success' : 'error');
      setPikaStatusMessage(
        outcome.ok
          ? '源码运行完成（print 输出见终端 logcat）'
          : outcome.message,
      );
    } catch (error) {
      setPikaStatusKind('error');
      setPikaStatusMessage(
        error instanceof Error ? error.message : '运行失败',
      );
    } finally {
      setPikaAction('idle');
    }
  }, [generatedCode]);

  const handleRunBytecode = useCallback(async () => {
    if (!bytecodePath) {
      setPikaStatusKind('error');
      setPikaStatusMessage('请先编译生成字节码');
      return;
    }

    setPikaAction('running');
    setPikaStatusKind('idle');
    setPikaStatusMessage('正在运行字节码…');
    setPikaFeedback('run');
    try {
      const outcome = await runCompiledBytecode(bytecodePath);
      setPikaStatusKind(outcome.ok ? 'success' : 'error');
      setPikaStatusMessage(
        outcome.ok
          ? '字节码运行完成（print 输出见终端 logcat）'
          : outcome.message,
      );
    } catch (error) {
      setPikaStatusKind('error');
      setPikaStatusMessage(
        error instanceof Error ? error.message : '运行失败',
      );
    } finally {
      setPikaAction('idle');
    }
  }, [bytecodePath]);

  const isPikaBusy = pikaAction !== 'idle';
  const statusText = formatPikaStatus(
    pikaAction,
    pikaFeedback,
    pikaStatusMessage,
    bytecodeSize,
    bytecodeHexPreview,
  );

  return (
    <View style={styles.root}>
      <View style={[styles.editorHeader, { paddingTop: insets.top }]}>
        <Pressable
          style={styles.headerPressable}
          onPress={() => navigation.goBack()}
          accessibilityRole="button"
          accessibilityLabel="返回"
        >
          <Image source={HomeIcon} style={styles.headerIcon} />
        </Pressable>
        <View style={styles.headerContent}>
          <Pressable
            style={styles.headerPressable}
            onPress={() => setIsCodePanelOpen(open => !open)}
            accessibilityRole="button"
            accessibilityLabel="代码示例"
          >
            <Image source={CodeViewIcon} style={styles.headerIcon} />
          </Pressable>
        </View>
      </View>
      <View style={styles.editorPanel}>
        <WebView
          ref={webViewRef}
          originWhitelist={['*']}
          source={{ html: EDITOR_BUNDLE_HTML }} //加载编辑器网页
          onMessage={handleMessage} //处理WebView发送的消息
          javaScriptEnabled
          domStorageEnabled
        />
        <NumberSliderOverlay
          session={rnSliderSession}
          onValueChange={(sessionId, value) => {
            injectEditorMessage(webViewRef.current, {
              type: 'editor.numberSlider.value',
              sessionId,
              value,
            });
          }}
          onClose={sessionId => {
            setRnSliderSession(null);
            resetInjectEditorMessageDedup();
            injectEditorMessage(webViewRef.current, {
              type: 'editor.numberSlider.close',
              sessionId,
            });
          }}
        />
        <PortPickerOverlay
          session={rnPortPickerSession}
          onValueChange={(sessionId, value) => {
            injectEditorMessage(webViewRef.current, {
              type: 'editor.portPicker.value',
              sessionId,
              value,
            });
          }}
          onClose={sessionId => {
            setRnPortPickerSession(null);
            resetInjectEditorMessageDedup();
            injectEditorMessage(webViewRef.current, {
              type: 'editor.portPicker.close',
              sessionId,
            });
          }}
        />
        <MatrixLightOverlay
          session={rnMatrixLightSession}
          onCommit={(sessionId, rows) => {
            setRnMatrixLightSession(null);
            resetInjectEditorMessageDedup();
            injectEditorMessage(webViewRef.current, {
              type: 'editor.matrixLight.commit',
              sessionId,
              rows,
            });
          }}
          onClose={sessionId => {
            setRnMatrixLightSession(null);
            resetInjectEditorMessageDedup();
            injectEditorMessage(webViewRef.current, {
              type: 'editor.matrixLight.close',
              sessionId,
            });
          }}
        />
        <NotePickerOverlay
          session={rnNotePickerSession}
          onCommit={(sessionId, value) => {
            setRnNotePickerSession(null);
            resetInjectEditorMessageDedup();
            injectEditorMessage(webViewRef.current, {
              type: 'editor.notePicker.commit',
              sessionId,
              value,
            });
          }}
          onClose={sessionId => {
            setRnNotePickerSession(null);
            resetInjectEditorMessageDedup();
            injectEditorMessage(webViewRef.current, {
              type: 'editor.notePicker.close',
              sessionId,
            });
          }}
        />
        <HandleShankPickerOverlay
          session={rnHandleShankSession}
          onCommit={(sessionId, value) => {
            setRnHandleShankSession(null);
            resetInjectEditorMessageDedup();
            injectEditorMessage(webViewRef.current, {
              type: 'editor.handleShank.commit',
              sessionId,
              value,
            });
          }}
          onClose={sessionId => {
            setRnHandleShankSession(null);
            resetInjectEditorMessageDedup();
            injectEditorMessage(webViewRef.current, {
              type: 'editor.handleShank.close',
              sessionId,
            });
          }}
        />
        <VariablePromptOverlay
          session={rnVariablePromptSession}
          onCommit={(sessionId, name) => {
            setRnVariablePromptSession(null);
            resetInjectEditorMessageDedup();
            injectEditorMessage(webViewRef.current, {
              type: 'editor.variablePrompt.commit',
              sessionId,
              name,
            });
          }}
          onCancel={sessionId => {
            setRnVariablePromptSession(null);
            resetInjectEditorMessageDedup();
            injectEditorMessage(webViewRef.current, {
              type: 'editor.variablePrompt.cancel',
              sessionId,
            });
          }}
        />
        {isCodePanelOpen && (
          <View style={styles.codePanel}>
            <Text style={styles.codeTitle}>生成代码</Text>
            <Text style={styles.meta}>积木数量：{blockCount}</Text>
            <View style={pikaActionStyles.actionRow}>
              <Pressable
                style={[
                  pikaActionStyles.actionButton,
                  isPikaBusy && pikaActionStyles.actionButtonDisabled,
                ]}
                disabled={isPikaBusy}
                onPress={handleCompile}
                accessibilityRole="button"
                accessibilityLabel="编译 Python 字节码"
              >
                {pikaAction === 'compiling' ? (
                  <ActivityIndicator color="#ffffff" size="small" />
                ) : (
                  <Text style={pikaActionStyles.actionButtonText}>编译</Text>
                )}
              </Pressable>
              <Pressable
                style={[
                  pikaActionStyles.actionButton,
                  pikaActionStyles.actionButtonSecondary,
                  isPikaBusy && pikaActionStyles.actionButtonDisabled,
                ]}
                disabled={isPikaBusy}
                onPress={handleRunSource}
                accessibilityRole="button"
                accessibilityLabel="本地运行源码"
              >
                <Text style={pikaActionStyles.actionButtonText}>运行源码</Text>
              </Pressable>
            </View>
            <Pressable
              style={[
                pikaActionStyles.actionButton,
                (!bytecodePath || isPikaBusy) &&
                  pikaActionStyles.actionButtonDisabled,
              ]}
              disabled={!bytecodePath || isPikaBusy}
              onPress={handleRunBytecode}
              accessibilityRole="button"
              accessibilityLabel="本地运行字节码"
            >
              <Text style={pikaActionStyles.actionButtonText}>运行字节码</Text>
            </Pressable>
            <Text
              style={[
                pikaActionStyles.statusText,
                pikaStatusKind === 'error' && pikaActionStyles.statusError,
                pikaStatusKind === 'success' && pikaActionStyles.statusSuccess,
              ]}
            >
              {statusText}
            </Text>
            <ScrollView style={styles.codeScroll} nestedScrollEnabled>
              <Text style={styles.code} selectable>
                {generatedCode}
              </Text>
            </ScrollView>
          </View>
        )}
      </View>
    </View>
  );
}
