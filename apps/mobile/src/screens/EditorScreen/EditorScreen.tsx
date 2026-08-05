import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
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
  RnVariablePromptOpenMessage,
} from '@scratch-mobile/shared';
import {
  getCurrentAppLocale,
  resolveProjectDisplayName,
  useTranslation,
} from '@scratch-mobile/i18n';
import { EDITOR_EMBEDDED_LOCALE_GLOBAL } from '@scratch-mobile/shared';
import {
  HandleShankPickerOverlay,
  injectEditorLocale,
  injectEditorMessage,
  loadEditorBundleHtml,
  MatrixLightOverlay,
  NotePickerOverlay,
  NumberSliderOverlay,
  resetInjectEditorMessageDedup,
  VariablePromptOverlay,
} from '../../features/editor';
import { GeneratedCodePanel } from './GeneratedCodePanel';
import { type RootStackParamList } from '../../app/navigation';
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
  const { t, i18n } = useTranslation('editorShell');
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();
  const sidePanelWidth = Math.min(280, Math.round(screenWidth * 0.72));
  const webViewRef = useRef<WebView>(null);
  const lastCodeRef = useRef({ code: '', blockCount: 0 });
  //存储当前激活的数字滑块会话
  const [rnSliderSession, setRnSliderSession] =
    useState<RnNumberSliderOpenMessage | null>(null);
  const [rnMatrixLightSession, setRnMatrixLightSession] =
    useState<RnMatrixLightOpenMessage | null>(null);
  const [rnNotePickerSession, setRnNotePickerSession] =
    useState<RnNotePickerOpenMessage | null>(null);
  const [rnHandleShankSession, setRnHandleShankSession] =
    useState<RnHandleShankOpenMessage | null>(null);
  const [rnVariablePromptSession, setRnVariablePromptSession] =
    useState<RnVariablePromptOpenMessage | null>(null);
  const [editorHtml, setEditorHtml] = useState<string | null>(null);
  const [editorHtmlError, setEditorHtmlError] = useState<string | null>(null);
  const codePlaceholderRef = useRef(t('loading.codePlaceholder'));
  const [generatedCode, setGeneratedCode] = useState(() =>
    t('loading.codePlaceholder'),
  );
  //存储积木数量
  const [blockCount, setBlockCount] = useState(0);
  //存储代码面板是否打开
  const [isCodePanelOpen, setIsCodePanelOpen] = useState(false);
  const [isSlotPickerVisible, setIsSlotPickerVisible] = useState(false);
  const [isSensorPanelOpen, setIsSensorPanelOpen] = useState(false);

  useEffect(() => {
    const nextPlaceholder = t('loading.codePlaceholder');
    setGeneratedCode(prev =>
      prev === codePlaceholderRef.current ? nextPlaceholder : prev,
    );
    codePlaceholderRef.current = nextPlaceholder;
  }, [i18n.language, t]);

  const handleMatrixLightCommit = useCallback(
    (sessionId: string, rows: string) => {
      setRnMatrixLightSession(null);
      resetInjectEditorMessageDedup();
      injectEditorMessage(webViewRef.current, {
        type: 'editor.matrixLight.commit',
        sessionId,
        rows,
      });
    },
    [], // webViewRef 是 ref，不需要放进 deps
  );
  const handleMatrixLightClose = useCallback((sessionId: string) => {
    setRnMatrixLightSession(null);
    resetInjectEditorMessageDedup();
    injectEditorMessage(webViewRef.current, {
      type: 'editor.matrixLight.close',
      sessionId,
    });
  }, []);
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

  useEffect(() => {
    let cancelled = false;
    void loadEditorBundleHtml()
      .then(html => {
        if (!cancelled) {
          setEditorHtml(html);
          setEditorHtmlError(null);
        }
      })
      .catch(error => {
        if (!cancelled) {
          setEditorHtmlError(
            error instanceof Error ? error.message : String(error),
          );
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

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

  const projectErrorKey = loadError ?? saveError;
  const projectError = projectErrorKey
    ? t(`persistence.${projectErrorKey}`)
    : null;
  const displayProjectName = resolveProjectDisplayName(projectName);

  // bootstrap 首帧前写入 App 语言，避免 WebView 用 navigator 语言渲染飞栏后再闪一下。
  const editorEmbeddedLocaleScript = useMemo(
    () =>
      `window.${EDITOR_EMBEDDED_LOCALE_GLOBAL}=${JSON.stringify(
        getCurrentAppLocale(),
      )};true;`,
    [i18n.language],
  );

  useEffect(() => {
    const syncEditorLocale = () => {
      injectEditorLocale(webViewRef.current);
    };
    i18n.on('languageChanged', syncEditorLocale);
    return () => {
      i18n.off('languageChanged', syncEditorLocale);
    };
  }, [i18n]);

  const handleNavigateBack = useCallback(async () => {
    await handleBackPress();
    navigation.goBack();
  }, [handleBackPress, navigation]);

  //处理WebView发送的消息
  const handleEditorMessage = useCallback(
    (message: EditorOutMessage) => {
      switch (message.type) {
        case 'editor.workspace.ready':
          // 兜底：embedded 未生效时（如预览）仍同步 App 语言；同语言时 Web 端会 no-op。
          injectEditorLocale(webViewRef.current);
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
          accessibilityLabel={t('toolbar.back')}
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
        <BatteryStatusLight />
        <View style={styles.headerHostActions}>
          <Pressable
            style={[
              styles.hostActionButton,
              !canHostAction && styles.hostActionButtonDisabled,
            ]}
            disabled={!canHostAction}
            onPress={handleRunOnHost}
            accessibilityRole="button"
            accessibilityLabel={t('toolbar.runOnHost')}
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
            accessibilityLabel={t('toolbar.pauseHost')}
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
            accessibilityLabel={t('toolbar.downloadToHost')}
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
            accessibilityLabel={t('toolbar.programSlot', { slot: programSlot })}
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
            accessibilityLabel={t('toolbar.sensorStatus')}
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
            accessibilityLabel={t('toolbar.codePreview')}
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
        {editorHtmlError ? (
          <View style={styles.projectLoadingOverlay} pointerEvents="auto">
            <Text style={styles.projectLoadingText}>{editorHtmlError}</Text>
          </View>
        ) : editorHtml == null ? (
          <View style={styles.projectLoadingOverlay} pointerEvents="auto">
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.projectLoadingText}>
              {t('loading.project')}
            </Text>
          </View>
        ) : (
          <WebView
            ref={webViewRef}
            originWhitelist={['*']}
            source={{ html: editorHtml }}
            injectedJavaScriptBeforeContentLoaded={editorEmbeddedLocaleScript}
            onMessage={handleMessage}
            javaScriptEnabled
            domStorageEnabled
          />
        )}
        {isProjectLoading ? (
          <View style={styles.projectLoadingOverlay} pointerEvents="auto">
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.projectLoadingText}>
              {t('loading.project')}
            </Text>
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
        <MatrixLightOverlay
          session={rnMatrixLightSession}
          onCommit={handleMatrixLightCommit}
          onClose={handleMatrixLightClose}
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
            <DeviceDetailsPanel onClose={() => setIsSensorPanelOpen(false)} />
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
