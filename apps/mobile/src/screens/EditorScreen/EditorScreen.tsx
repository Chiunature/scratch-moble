import React, { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  Image,
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
import { buildHostBytecodeFileName } from '../../services/ble';
import { ScrollablePanel } from '../../components/ScrollablePanel';
import { styles, pikaActionStyles } from './EditorScreen.styles';
import { useEditorPikaWorkflow } from './useEditorPikaWorkflow';
import HomeIcon from '../../../assets/editorScreen/home.png';
import CodeViewIcon from '../../../assets/editorScreen/codeView.png';

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

  const {
    pikaAction,
    pikaStatusKind,
    statusText,
    bytecodePath,
    programSlot,
    setProgramSlot,
    isBleConnected,
    isPikaBusy,
    canUploadToHost,
    handleCompile,
    handleRunSource,
    handleRunBytecode,
    handleUploadToHost,
    hostProgramSlotMin,
    hostProgramSlotMax,
  } = useEditorPikaWorkflow(generatedCode);

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
            <ScrollablePanel style={styles.codePanelBody}>
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
            <View style={pikaActionStyles.slotRow}>
              <Text style={pikaActionStyles.slotLabel}>主机程序槽</Text>
              <View style={pikaActionStyles.slotControls}>
                <Pressable
                  style={[
                    pikaActionStyles.slotButton,
                    (programSlot <= hostProgramSlotMin || isPikaBusy) &&
                      pikaActionStyles.actionButtonDisabled,
                  ]}
                  disabled={programSlot <= hostProgramSlotMin || isPikaBusy}
                  onPress={() =>
                    setProgramSlot(slot => Math.max(hostProgramSlotMin, slot - 1))
                  }
                  accessibilityRole="button"
                  accessibilityLabel="减少程序槽位"
                >
                  <Text style={pikaActionStyles.slotButtonText}>−</Text>
                </Pressable>
                <Text style={pikaActionStyles.slotValue}>
                  {buildHostBytecodeFileName(programSlot)}
                </Text>
                <Pressable
                  style={[
                    pikaActionStyles.slotButton,
                    (programSlot >= hostProgramSlotMax || isPikaBusy) &&
                      pikaActionStyles.actionButtonDisabled,
                  ]}
                  disabled={programSlot >= hostProgramSlotMax || isPikaBusy}
                  onPress={() =>
                    setProgramSlot(slot => Math.min(hostProgramSlotMax, slot + 1))
                  }
                  accessibilityRole="button"
                  accessibilityLabel="增加程序槽位"
                >
                  <Text style={pikaActionStyles.slotButtonText}>+</Text>
                </Pressable>
              </View>
            </View>
            <Pressable
              style={[
                pikaActionStyles.actionButton,
                pikaActionStyles.actionButtonUpload,
                !canUploadToHost && pikaActionStyles.actionButtonDisabled,
              ]}
              disabled={!canUploadToHost}
              onPress={handleUploadToHost}
              accessibilityRole="button"
              accessibilityLabel="上传字节码到蓝牙主机"
            >
              {pikaAction === 'uploading' ? (
                <ActivityIndicator color="#ffffff" size="small" />
              ) : (
                <Text style={pikaActionStyles.actionButtonText}>
                  {isBleConnected ? '上传到主机' : '上传到主机（需连接蓝牙）'}
                </Text>
              )}
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
            <Text style={styles.codeSectionLabel}>Python 源码</Text>
            <View style={styles.codeBlock}>
              <Text style={styles.code} selectable>
                {generatedCode}
              </Text>
            </View>
            </ScrollablePanel>
          </View>
        )}
      </View>
    </View>
  );
}
