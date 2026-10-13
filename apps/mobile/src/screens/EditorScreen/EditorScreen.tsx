import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  View,
  Text,
  useWindowDimensions,
} from 'react-native';
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
import { AssistantConnectionSettings } from '../../features/assistant/AssistantConnectionSettings';
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
  const { width: screenWidth } = useWindowDimensions();
  const sidePanelWidth = Math.min(280, Math.round(screenWidth * 0.72));
  const webViewRef = useRef<WebView>(null);
  const assistantBridge = useAssistantBridge(webViewRef, projectId);
  const [assistantOpen, setAssistantOpen] = useState(openAssistant === true);
  const [assistantSettingsOpen, setAssistantSettingsOpen] = useState(false);
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

  const { handleNavigateBack } = useEditorLeaveFlush(
    navigation,
    persistence.handleBackPress,
  );

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
        onToggleCodePanel={toggleCodePanel}
        onToggleSensorPanel={toggleSensorPanel}
      />
      <View style={styles.assistantActions}>
        <Pressable
          accessibilityRole="button"
          disabled={!assistantAvailable}
          onPress={() => setAssistantOpen(true)}
        >
          <Text style={{ color: colors.primary }}>积木助手</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          onPress={() => setAssistantSettingsOpen(true)}
        >
          <Text style={{ color: colors.primary }}>模型配置</Text>
        </Pressable>
      </View>
      <AssistantPanel
        projectId={projectId}
        visible={assistantOpen && assistantAvailable}
        persistenceError={
          persistenceStatus === 'saveFailed' ? projectError : null
        }
        request={assistantBridge.request}
        onClose={() => setAssistantOpen(false)}
      />
      <AssistantConnectionSettings
        visible={assistantSettingsOpen}
        onClose={() => setAssistantSettingsOpen(false)}
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
      </View>
    </View>
  );
}
