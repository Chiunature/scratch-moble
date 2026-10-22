import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  BackHandler,
  View,
  Text,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { WebView } from 'react-native-webview';
import {
  useNavigation,
  useRoute,
  type RouteProp,
} from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import {
  resolveProjectDisplayName,
  useTranslation,
} from '@scratch-mobile/i18n';
import {
  EditorBridgeView,
  EditorSessionOverlays,
  PikaWorkflowModal,
  useEditorBridgeShell,
  useEditorSessionManager,
  useEditorLeaveFlush,
  useEditorPikaWorkflow,
  useEditorProjectPersistence,
} from '../../features/editor';
import { AssistantPanel } from '../../features/assistant/AssistantPanel';
import { useAssistantBridge } from '../../features/assistant/useAssistantBridge';
import { GeneratedCodePanel } from './GeneratedCodePanel';
import { EditorHeader } from './EditorHeader';
import { type RootStackParamList } from '../../app/navigation';
import { styles } from './EditorScreen.styles';
import { colors } from '../../theme';
import { ProgramSlotPickerModal } from './ProgramSlotPickerModal';
import { DeviceDetailsPanel } from './DeviceDetailsPanel';

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

  return (
    <EditorScreenContent
      key={projectId}
      projectId={projectId}
      openAssistant={route.params?.assistant}
    />
  );
}

function EditorScreenContent({
  projectId,
  openAssistant,
}: {
  projectId: string;
  openAssistant?: boolean;
}) {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { t } = useTranslation('editorShell');
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();
  const sidePanelWidth = Math.min(280, Math.round(screenWidth * 0.72));
  const webViewRef = useRef<WebView>(null);
  const assistantBridge = useAssistantBridge(webViewRef, projectId);
  const [assistantOpen, setAssistantOpen] = useState(openAssistant === true);
  const [assistantBusy, setAssistantBusy] = useState(false);
  const [isCodePanelOpen, setIsCodePanelOpen] = useState(false);
  const [isSlotPickerVisible, setIsSlotPickerVisible] = useState(false);
  const [isSensorPanelOpen, setIsSensorPanelOpen] = useState(false);

  const persistence = useEditorProjectPersistence({
    webViewRef,
    projectId,
  });
  const bridgeShell = useEditorBridgeShell({ webViewRef });
  const sessionManager = useEditorSessionManager({
    webViewRef,
    codePlaceholder: bridgeShell.codePlaceholder,
    onWorkspaceReady: persistence.handleWorkspaceReady,
    onWorkspaceLoaded: persistence.handleWorkspaceLoaded,
    onWorkspaceChanged: persistence.handleWorkspaceChanged,
  });
  // 组合 Shell + SessionManager，对外形状与拆分前一致（JSX 渲染结构不变）
  const bridge = {
    ...bridgeShell,
    ...sessionManager,
  };
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
  } = useEditorPikaWorkflow(bridge.generatedCode);

  const persistenceStatus = persistence.status;
  const assistantAvailable =
    persistenceStatus === 'ready' || persistenceStatus === 'saveFailed';
  const projectError =
    persistenceStatus === 'loading' || persistenceStatus === 'ready'
      ? null
      : t(`persistence.${persistenceStatus}`);
  const displayProjectName = resolveProjectDisplayName(persistence.projectName);

  const toggleCodePanel = useCallback(() => {
    setIsCodePanelOpen(open => {
      if (!open) {
        setIsSensorPanelOpen(false);
        if (!assistantBusy) setAssistantOpen(false);
      }
      return !open;
    });
  }, [assistantBusy]);

  const toggleSensorPanel = useCallback(() => {
    setIsSensorPanelOpen(open => {
      if (!open) {
        setIsCodePanelOpen(false);
        if (!assistantBusy) setAssistantOpen(false);
      }
      return !open;
    });
  }, [assistantBusy]);

  const toggleAssistant = useCallback(() => {
    if (assistantOpen) {
      if (!assistantBusy) setAssistantOpen(false);
      return;
    }
    setIsCodePanelOpen(false);
    setIsSensorPanelOpen(false);
    setAssistantOpen(true);
  }, [assistantBusy, assistantOpen]);

  const handleAssistantBusyChange = useCallback((busy: boolean) => {
    setAssistantBusy(busy);
  }, []);

  const { handleNavigateBack } = useEditorLeaveFlush(
    navigation,
    persistence.handleBackPress,
  );
  const assistantShown = assistantOpen && assistantAvailable;

  useEffect(() => {
    if (!assistantShown) return;
    const subscription = BackHandler.addEventListener(
      'hardwareBackPress',
      () => {
        if (!assistantBusy) setAssistantOpen(false);
        return true;
      },
    );
    return () => subscription.remove();
  }, [assistantBusy, assistantShown]);

  return (
    <View style={styles.root}>
      <EditorHeader
        title={displayProjectName}
        error={projectError}
        canHostAction={canHostAction}
        pikaAction={pikaAction}
        activeHostAction={activeHostAction}
        programSlot={programSlot}
        isCodePanelOpen={isCodePanelOpen}
        isSensorPanelOpen={isSensorPanelOpen}
        onBack={() => {
          void handleNavigateBack();
        }}
        onRunOnHost={handleRunOnHost}
        onPauseHost={handlePauseHost}
        onDownloadToHost={handleDownloadToHost}
        onOpenSlotPicker={() => setIsSlotPickerVisible(true)}
        isAssistantOpen={assistantShown}
        assistantAvailable={assistantAvailable}
        assistantBusy={assistantBusy}
        onToggleCodePanel={toggleCodePanel}
        onToggleSensorPanel={toggleSensorPanel}
        onToggleAssistant={toggleAssistant}
      />
      <ProgramSlotPickerModal
        visible={isSlotPickerVisible}
        selectedSlot={programSlot}
        onSelect={setProgramSlot}
        onClose={() => setIsSlotPickerVisible(false)}
      />
      <PikaWorkflowModal {...workflowModal} onClose={closeWorkflowModal} />
      <View style={styles.editorPanel}>
        <EditorBridgeView
          webViewRef={webViewRef}
          html={bridge.editorHtml}
          htmlError={bridge.editorHtmlError}
          embeddedLocaleScript={bridge.editorEmbeddedLocaleScript}
          onMessage={event => {
            assistantBridge.handleMessage(event);
            bridge.handleMessage(event);
          }}
          onLoadEnd={bridge.handleWebViewLoadEnd}
        />
        {persistence.status === 'loading' ? (
          <View style={styles.projectLoadingOverlay} pointerEvents="auto">
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.projectLoadingText}>
              {t('loading.project')}
            </Text>
          </View>
        ) : null}
        <EditorSessionOverlays
          sessions={bridge.sessions}
          onSend={bridge.send}
        />
        {isSensorPanelOpen ? (
          <View style={[styles.sidePanel, { width: sidePanelWidth }]}>
            <DeviceDetailsPanel onClose={() => setIsSensorPanelOpen(false)} />
          </View>
        ) : null}
        {isCodePanelOpen ? (
          <View style={[styles.sidePanel, { width: sidePanelWidth }]}>
            <GeneratedCodePanel code={bridge.generatedCode} />
          </View>
        ) : null}
        <View
          pointerEvents={assistantShown ? 'auto' : 'none'}
          accessibilityElementsHidden={!assistantShown}
          importantForAccessibility={
            assistantShown ? 'auto' : 'no-hide-descendants'
          }
          style={[
            styles.assistantDrawer,
            {
              paddingBottom: insets.bottom,
              paddingRight: insets.right,
            },
            !assistantShown && styles.assistantDrawerHidden,
          ]}
        >
          <AssistantPanel
            projectId={projectId}
            visible={assistantShown}
            persistenceError={
              persistenceStatus === 'saveFailed' ? projectError : null
            }
            request={assistantBridge.request}
            onClose={() => setAssistantOpen(false)}
            onBusyChange={handleAssistantBusyChange}
          />
        </View>
      </View>
    </View>
  );
}
