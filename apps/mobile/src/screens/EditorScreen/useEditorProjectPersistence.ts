import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import type { WebView } from 'react-native-webview';

import { getDefaultProjectName } from '@scratch-mobile/i18n';
import type { RnWorkspaceChangedMessage } from '@scratch-mobile/shared';

import { forceInjectEditorMessage, injectEditorLocale } from '../../features/editor';
import {
  loadProject,
  ProjectDocumentParseError,
  saveProjectWorkspace,
  waitForPendingProjectSaves,
} from '../../services/projects';
import { useProjectStore } from '../../store/useProjectStore';

const FLUSH_TIMEOUT_MS = 2500;

type Options = {
  webViewRef: React.RefObject<WebView | null>;
  projectId: string;
};

export function useEditorProjectPersistence({
  webViewRef,
  projectId,
}: Options) {
  const loadRevisionRef = useRef(0);
  const pendingFlushRef = useRef<(() => void) | null>(null);
  const lastSaveSucceededRef = useRef(true);
  const upsertSummary = useProjectStore(state => state.upsertSummary);
  const [projectName, setProjectName] = useState(getDefaultProjectName);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isProjectLoading, setIsProjectLoading] = useState(true);

  const injectLoad = useCallback(
    (workspace: unknown | null) => {
      loadRevisionRef.current += 1;
      injectEditorLocale(webViewRef.current);
      forceInjectEditorMessage(webViewRef.current, {
        type: 'editor.workspace.load',
        projectId,
        workspace,
        revision: loadRevisionRef.current,
      });
    },
    [projectId, webViewRef],
  );

  const handleWorkspaceReady = useCallback(async () => {
    setIsProjectLoading(true);
    setLoadError(null);
    setSaveError(null);
    try {
      const document = await loadProject(projectId);
      setProjectName(document.name);
      injectLoad(document.workspace);
    } catch (error) {
      setLoadError(
        error instanceof ProjectDocumentParseError
          ? '作品数据损坏'
          : '无法加载作品',
      );
      injectLoad(null);
    }
  }, [injectLoad, projectId]);

  const handleWorkspaceLoaded = useCallback(
    (loadedProjectId: string) => {
      if (loadedProjectId !== projectId) {
        return;
      }
      setIsProjectLoading(false);
    },
    [projectId],
  );

  const handleWorkspaceChanged = useCallback(
    async (message: RnWorkspaceChangedMessage) => {
      if (message.projectId !== projectId) {
        return;
      }

      try {
        const summary = await saveProjectWorkspace({
          projectId,
          workspace: message.workspace,
          blockCount: message.blockCount,
        });
        setProjectName(summary.name);
        upsertSummary(summary);
        setSaveError(null);
        lastSaveSucceededRef.current = true;
        pendingFlushRef.current?.();
      } catch {
        lastSaveSucceededRef.current = false;
        setSaveError('保存失败，请重试');
      } finally {
        pendingFlushRef.current = null;
      }
    },
    [projectId, upsertSummary],
  );

  const flushAndWait = useCallback(async () => {
    await waitForPendingProjectSaves(projectId);

    await new Promise<void>(resolve => {
      let settled = false;
      const finish = () => {
        if (settled) {
          return;
        }
        settled = true;
        pendingFlushRef.current = null;
        resolve();
      };

      pendingFlushRef.current = finish;
      forceInjectEditorMessage(webViewRef.current, {
        type: 'editor.workspace.flush',
        projectId,
      });

      setTimeout(finish, FLUSH_TIMEOUT_MS);
    });

    await waitForPendingProjectSaves(projectId);

    if (!lastSaveSucceededRef.current) {
      setSaveError('保存失败，请重试');
    }
  }, [projectId, webViewRef]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', nextState => {
      if (nextState === 'background' || nextState === 'inactive') {
        void flushAndWait();
      }
    });

    return () => {
      subscription.remove();
    };
  }, [flushAndWait]);

  const handleBackPress = useCallback(async () => {
    await flushAndWait();
  }, [flushAndWait]);

  return {
    projectName,
    loadError,
    saveError,
    isProjectLoading,
    handleWorkspaceReady,
    handleWorkspaceLoaded,
    handleWorkspaceChanged,
    handleBackPress,
  };
}
