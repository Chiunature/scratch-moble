import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
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

import { resolveProjectDisplayName, useTranslation } from '@scratch-mobile/i18n';
import {
  EditorBridgeView,
  EditorSessionOverlays,
  PikaWorkflowModal,
  useEditorBridge,
  useEditorLeaveFlush,
  useEditorPikaWorkflow,
  useEditorProjectPersistence,
} from '../../features/editor';
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

  return <EditorScreenContent projectId={projectId} />;
}

function EditorScreenContent({ projectId }: { projectId: string }) {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { t } = useTranslation('editorShell');
  const { width: screenWidth } = useWindowDimensions();
  const sidePanelWidth = Math.min(280, Math.round(screenWidth * 0.72));
  const webViewRef = useRef<WebView>(null);
  const [isCodePanelOpen, setIsCodePanelOpen] = useState(false);
  const [isSlotPickerVisible, setIsSlotPickerVisible] = useState(false);
  const [isSensorPanelOpen, setIsSensorPanelOpen] = useState(false);

  const persistence = useEditorProjectPersistence({
    webViewRef,
    projectId,
  });
  const bridge = useEditorBridge({
    webViewRef,
    onWorkspaceReady: persistence.handleWorkspaceReady,
    onWorkspaceLoaded: persistence.handleWorkspaceLoaded,
    onWorkspaceChanged: persistence.handleWorkspaceChanged,
  });
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

  const projectErrorKey = persistence.loadError ?? persistence.saveError;
  const projectError = projectErrorKey
    ? t(`persistence.${projectErrorKey}`)
    : null;
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
          onMessage={bridge.handleMessage}
        />
        {persistence.isProjectLoading ? (
          <View style={styles.projectLoadingOverlay} pointerEvents="auto">
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.projectLoadingText}>
              {t('loading.project')}
            </Text>
          </View>
        ) : null}
        <EditorSessionOverlays sessions={bridge.sessions} onSend={bridge.send} />
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