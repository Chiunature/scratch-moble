import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import type { WebView } from 'react-native-webview';

import { getDefaultProjectName } from '@scratch-mobile/i18n';
import type { RnWorkspaceChangedMessage } from '@scratch-mobile/shared';

import { editorMessageDeduper } from '../bridge/injectEditorMessage';
import {
  loadProject,
  ProjectDocumentParseError,
  saveProjectWorkspace,
  waitForPendingProjectSaves,
} from '../../../services/projects';
import { useProjectStore } from '../../../store/useProjectStore';

const FLUSH_TIMEOUT_MS = 2500;
const WORKSPACE_SAVE_DEBOUNCE_MS = 500;

type ProjectPersistenceErrorKey = 'loadCorrupt' | 'loadFailed' | 'saveFailed';

type Options = {
  webViewRef: React.RefObject<WebView | null>;
  projectId: string;
};

export function useEditorProjectPersistence({
  webViewRef,
  projectId,
}: Options) {
  const loadRevisionRef = useRef(0);
  const lastAcceptedRevisionRef = useRef(0);
  const pendingWorkspaceChangeRef = useRef<RnWorkspaceChangedMessage | null>(
    null,
  );
  const saveDebounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const activeSaveRef = useRef<Promise<void> | null>(null);
  const pendingFlushRef = useRef<(() => void) | null>(null);
  const lastSaveSucceededRef = useRef(true);
  const upsertSummary = useProjectStore(state => state.upsertSummary);
  const [projectName, setProjectName] = useState(getDefaultProjectName);
  const [loadError, setLoadError] = useState<ProjectPersistenceErrorKey | null>(
    null,
  );
  const [saveError, setSaveError] = useState<ProjectPersistenceErrorKey | null>(
    null,
  );
  const [isProjectLoading, setIsProjectLoading] = useState(true);

  const injectLoad = useCallback(
    (workspace: unknown | null) => {
      loadRevisionRef.current += 1;
      lastAcceptedRevisionRef.current = loadRevisionRef.current;
      editorMessageDeduper.forceInject(webViewRef.current, {
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
          ? 'loadCorrupt'
          : 'loadFailed',
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

  const clearSaveDebounceTimer = useCallback(() => {
    if (saveDebounceTimerRef.current == null) {
      return;
    }
    clearTimeout(saveDebounceTimerRef.current);
    saveDebounceTimerRef.current = null;
  }, []);

  const persistWorkspaceChange = useCallback(
    async (message: RnWorkspaceChangedMessage) => {
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
        setSaveError('saveFailed');
      } finally {
        pendingFlushRef.current = null;
      }
    },
    [projectId, upsertSummary],
  );

  const drainWorkspaceSaveQueue = useCallback(async () => {
    if (activeSaveRef.current) {
      return activeSaveRef.current;
    }

    const savePromise = (async () => {
      while (pendingWorkspaceChangeRef.current) {
        const message = pendingWorkspaceChangeRef.current;
        pendingWorkspaceChangeRef.current = null;
        await persistWorkspaceChange(message);
      }
    })().finally(() => {
      activeSaveRef.current = null;
    });

    activeSaveRef.current = savePromise;
    return savePromise;
  }, [persistWorkspaceChange]);

  const flushPendingWorkspaceChange = useCallback(async () => {
    clearSaveDebounceTimer();
    await drainWorkspaceSaveQueue();
  }, [clearSaveDebounceTimer, drainWorkspaceSaveQueue]);

  const handleWorkspaceChanged = useCallback(
    (message: RnWorkspaceChangedMessage) => {
      if (message.projectId !== projectId) {
        return;
      }

      if (message.revision < lastAcceptedRevisionRef.current) {
        return;
      }

      lastAcceptedRevisionRef.current = message.revision;
      pendingWorkspaceChangeRef.current = message;

      if (pendingFlushRef.current) {
        clearSaveDebounceTimer();
        void drainWorkspaceSaveQueue();
        return;
      }

      clearSaveDebounceTimer();
      saveDebounceTimerRef.current = setTimeout(() => {
        saveDebounceTimerRef.current = null;
        void drainWorkspaceSaveQueue();
      }, WORKSPACE_SAVE_DEBOUNCE_MS);
    },
    [clearSaveDebounceTimer, drainWorkspaceSaveQueue, projectId],
  );

  const flushAndWait = useCallback(async () => {
    await flushPendingWorkspaceChange();
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
      editorMessageDeduper.forceInject(webViewRef.current, {
        type: 'editor.workspace.flush',
        projectId,
      });

      setTimeout(finish, FLUSH_TIMEOUT_MS);
    });

    await flushPendingWorkspaceChange();
    await waitForPendingProjectSaves(projectId);

    if (!lastSaveSucceededRef.current) {
      setSaveError('saveFailed');
    }
  }, [flushPendingWorkspaceChange, projectId, webViewRef]);

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

  useEffect(() => {
    return () => {
      clearSaveDebounceTimer();
    };
  }, [clearSaveDebounceTimer]);

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