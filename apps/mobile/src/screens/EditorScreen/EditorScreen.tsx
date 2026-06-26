import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  Image,
  View,
  Text,
  useWindowDimensions,
} from 'react-native';
import {
  useNavigation,
  useRoute,
  type RouteProp,
} from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
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
  resolveProjectDisplayName,
  useTranslation,
} from '@scratch-mobile/i18n';
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
import { GeneratedCodePanel } from './GeneratedCodePanel';
import { type RootStackParamList } from '../../app/navigation';
import { useDeviceWatch } from '../../services/ble';
import { useBleStore } from '../../store/useBleStore';
import { styles } from './EditorScreen.styles';
import { colors } from '../../theme';
import { useEditorProjectPersistence } from './useEditorProjectPersistence';
import { useEditorPikaWorkflow } from './useEditorPikaWorkflow';
import { PikaWorkflowModal } from './PikaWorkflowModal';
import { ProgramSlotPickerModal } from './ProgramSlotPickerModal';
import { BatteryStatusLight } from './BatteryStatusLight';
import { DeviceDetailsPanel } from './DeviceDetailsPanel';
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
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'Editor'>>();
  const projectId = route.params?.projectId;

  useEffect(() => {
    if (!projectId) {
      navigation.replace('Projects');
    }
  }, [navigation, projectId]);

  if (!projectId) {
    return (
      <View style={[styles.root, styles.projectLoadingContainer]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return <EditorScreenContent projectId={projectId} />;
}

type EditorScreenContentProps = {
  projectId: string;
};

function EditorScreenContent({ projectId }: EditorScreenContentProps) {
  const navigation = useNavigation();
  useTranslation('projects');
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();
  const sidePanelWidth = Math.min(280, Math.round(screenWidth * 0.72));
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
  const [isSensorPanelOpen, setIsSensorPanelOpen] = useState(false);

  const toggleCodePanel = useCallback(() => {
    setIsCodePanelOpen(open => {
      if (!open) {
        setIsSensorPanelOpen(false);
      }
      return !open;
    });
  }, []);

  const toggleSensorPanel = useCallback(() => {
    setIsSensorPanelOpen(open => {
      if (!open) {
        setIsCodePanelOpen(false);
      }
      return !open;
    });
  }, []);

  const connectionStatus = useBleStore(state => state.connectionStatus);
  const isBleConnected = connectionStatus === 'connected';
  const {
    watch,
    isAvailable,
    sensorPorts,
    sensorConnectedPorts,
    sensorPortCount,
  } = useDeviceWatch();

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

  const {
    projectName,
    loadError,
    saveError,
    isProjectLoading,
    handleWorkspaceReady,
    handleWorkspaceLoaded,
    handleWorkspaceChanged,
    handleBackPress,
  } = useEditorProjectPersistence({
    webViewRef,
    projectId,
  });

  const projectError = loadError ?? saveError;
  const displayProjectName = resolveProjectDisplayName(projectName);

  const handleNavigateBack = useCallback(async () => {
    await handleBackPress();
    navigation.goBack();
  }, [handleBackPress, navigation]);

  //处理WebView发送的消息
  const handleEditorMessage = useCallback(
    (message: EditorOutMessage) => {
      switch (message.type) {
        case 'editor.workspace.ready':
          void handleWorkspaceReady();
          return;
        case 'editor.workspace.loaded':
          handleWorkspaceLoaded(message.projectId);
          return;
        case 'editor.workspace.changed':
          void handleWorkspaceChanged(message);
          return;
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
    },
    [handleWorkspaceChanged, handleWorkspaceLoaded, handleWorkspaceReady],
  );

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
          onPress={() => {
            void handleNavigateBack();
          }}
          accessibilityRole="button"
          accessibilityLabel="返回"
        >
          <Image source={HomeIcon} style={styles.headerIcon} />
        </Pressable>
        <View style={styles.headerProjectTitleWrap}>
          <Text style={styles.headerProjectTitle} numberOfLines={1}>
            {displayProjectName}
          </Text>
          {projectError ? (
            <Text style={styles.headerProjectError} numberOfLines={1}>
              {projectError}
            </Text>
          ) : null}
        </View>
        <BatteryStatusLight
          battery={watch?.battery ?? null}
          isConnected={isBleConnected}
          hasData={isAvailable}
        />
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
            style={[
              styles.deviceButton,
              isSensorPanelOpen && styles.sidePanelActiveButton,
            ]}
            onPress={toggleSensorPanel}
            accessibilityRole="button"
            accessibilityLabel="传感器状态"
            accessibilityState={{ expanded: isSensorPanelOpen }}
          >
            <View style={styles.deviceIconGrid}>
              {[0, 1, 2, 3].map(index => (
                <View key={index} style={styles.deviceIconDot} />
              ))}
            </View>
          </Pressable>
          <Pressable
            style={[
              styles.headerPressable,
              isCodePanelOpen && styles.sidePanelActiveButton,
            ]}
            onPress={toggleCodePanel}
            accessibilityRole="button"
            accessibilityLabel="代码示例"
            accessibilityState={{ expanded: isCodePanelOpen }}
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
        {isProjectLoading ? (
          <View style={styles.projectLoadingOverlay} pointerEvents="auto">
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.projectLoadingText}>加载作品中…</Text>
          </View>
        ) : null}
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
          sensorPorts={sensorPorts}
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
        {isSensorPanelOpen ? (
          <View style={[styles.sidePanel, { width: sidePanelWidth }]}>
            <DeviceDetailsPanel
              isConnected={isBleConnected}
              isAvailable={isAvailable}
              battery={watch?.battery ?? null}
              isProgramRunning={watch?.isProgramRunning ?? false}
              connectedCount={sensorConnectedPorts.length}
              portCount={sensorPortCount}
              ports={sensorPorts}
              flashFree={watch?.flash?.free ?? null}
              flashTotal={watch?.flash?.total ?? null}
              version={watch?.version ?? null}
              heap={watch?.heap ?? null}
              onClose={() => setIsSensorPanelOpen(false)}
            />
          </View>
        ) : null}
        {isCodePanelOpen ? (
          <View style={[styles.sidePanel, { width: sidePanelWidth }]}>
            <GeneratedCodePanel code={generatedCode} />
          </View>
        ) : null}
      </View>
    </View>
  );
}
