import React, { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, Image, View, Text } from 'react-native';
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
import { ScrollablePanel } from '../../components/ScrollablePanel';
import { styles } from './EditorScreen.styles';
import { colors } from '../../theme';
import { useEditorPikaWorkflow } from './useEditorPikaWorkflow';
import { PikaWorkflowModal } from './PikaWorkflowModal';
import { ProgramSlotPickerModal } from './ProgramSlotPickerModal';
import HomeIcon from '../../../assets/editorScreen/home.png';
import CodeViewIcon from '../../../assets/editorScreen/codeView.png';
import RunIcon from '../../../assets/editorScreen/run.png';
import PauseIcon from '../../../assets/editorScreen/pause.png';
import DownloadIcon from '../../../assets/editorScreen/download.png';

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
  const [isSlotPickerVisible, setIsSlotPickerVisible] = useState(false);

  const {
    pikaAction,
    activeHostAction,
    workflowModal,
    closeWorkflowModal,
    programSlot,
    setProgramSlot,
    canHostAction,
    handleRunOnHost,
    handlePauseHost,
    handleDownloadToHost,
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
        <View style={styles.headerHostActions}>
          <Pressable
            style={[
              styles.hostActionButton,
              !canHostAction && styles.hostActionButtonDisabled,
            ]}
            disabled={!canHostAction}
            onPress={handleRunOnHost}
            accessibilityRole="button"
            accessibilityLabel="编译并在主机运行"
          >
            {activeHostAction === 'run' && pikaAction !== 'idle' ? (
              <ActivityIndicator color={colors.primary} size="small" />
            ) : (
              <Image source={RunIcon} style={styles.hostActionIcon} />
            )}
          </Pressable>
          <Pressable
            style={[
              styles.hostActionButton,
              !canHostAction && styles.hostActionButtonDisabled,
            ]}
            disabled={!canHostAction}
            onPress={handlePauseHost}
            accessibilityRole="button"
            accessibilityLabel="暂停主机程序"
          >
            {activeHostAction === 'pause' && pikaAction !== 'idle' ? (
              <ActivityIndicator color={colors.primary} size="small" />
            ) : (
              <Image source={PauseIcon} style={styles.hostActionIcon} />
            )}
          </Pressable>
          <Pressable
            style={[
              styles.hostActionButton,
              !canHostAction && styles.hostActionButtonDisabled,
            ]}
            disabled={!canHostAction}
            onPress={handleDownloadToHost}
            accessibilityRole="button"
            accessibilityLabel="编译并上传到主机"
          >
            {activeHostAction === 'download' && pikaAction !== 'idle' ? (
              <ActivityIndicator color={colors.primary} size="small" />
            ) : (
              <Image source={DownloadIcon} style={styles.hostActionIcon} />
            )}
          </Pressable>
        </View>
        <View style={styles.headerContent}>
          <Pressable
            style={styles.slotBadgeButton}
            onPress={() => setIsSlotPickerVisible(true)}
            accessibilityRole="button"
            accessibilityLabel={`当前程序槽 ${programSlot}，点击选择`}
          >
            <Text style={styles.slotBadgeText}>{programSlot}</Text>
          </Pressable>
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
      <ProgramSlotPickerModal
        visible={isSlotPickerVisible}
        selectedSlot={programSlot}
        onSelect={setProgramSlot}
        onClose={() => setIsSlotPickerVisible(false)}
      />
      <PikaWorkflowModal {...workflowModal} onClose={closeWorkflowModal} />
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
