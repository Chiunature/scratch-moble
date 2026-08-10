import { useCallback, useEffect, useState } from 'react';

import {
  buildHostBytecodeFileName,
  HOST_PROGRAM_SLOT_DEFAULT,
  stopHostApp,
  uploadBytecodeToHost,
} from '../../../services/ble';
import { useBleStore } from '../../../store/useBleStore';
import { compileGeneratedCode } from '../../../services/pika';
import type { PikaWorkflowModalState } from '../components/PikaWorkflowModal';

/**
 * 编辑器 PikaScript 工作流（轨道 A 编译 + 轨道 B BLE 上传）。
 */

export type PikaActionState = 'idle' | 'compiling' | 'running' | 'uploading';

export type { PikaWorkflowModalState } from '../components/PikaWorkflowModal';

type HostToolbarAction = 'run' | 'download' | 'pause';

const CLOSED_WORKFLOW_MODAL: PikaWorkflowModalState = {
  visible: false,
  kind: 'progress',
  titleKey: '',
  progress: null,
};

export function useEditorPikaWorkflow(generatedCode: string) {
  const connectionStatus = useBleStore(state => state.connectionStatus);
  const isBleConnected = connectionStatus === 'connected';

  const [pikaAction, setPikaAction] = useState<PikaActionState>('idle');
  const [workflowModal, setWorkflowModal] = useState<PikaWorkflowModalState>(
    CLOSED_WORKFLOW_MODAL,
  );
  const [bytecodePath, setBytecodePath] = useState<string | null>(null);
  const [bytecodeSize, setBytecodeSize] = useState<number | null>(null);
  const [bytecodeHexPreview, setBytecodeHexPreview] = useState('');
  const [programSlot, setProgramSlot] = useState(HOST_PROGRAM_SLOT_DEFAULT);
  const [activeHostAction, setActiveHostAction] =
    useState<HostToolbarAction | null>(null);

  const closeWorkflowModal = useCallback(() => {
    setWorkflowModal(CLOSED_WORKFLOW_MODAL);
  }, []);

  const showProgressModal = useCallback(
    (
      titleKey: string,
      messageKey: string,
      messageOptions?: Record<string, unknown>,
      progress: number | null = null,
    ) => {
      setWorkflowModal({
        visible: true,
        kind: 'progress',
        titleKey,
        messageKey,
        messageOptions,
        progress,
      });
    },
    [],
  );

  const showSuccessModal = useCallback(
    (
      titleKey: string,
      messageKey: string,
      messageOptions?: Record<string, unknown>,
    ) => {
      setWorkflowModal({
        visible: true,
        kind: 'success',
        titleKey,
        messageKey,
        messageOptions,
        progress: null,
      });
    },
    [],
  );

  const showErrorModal = useCallback(
    (
      titleKey: string,
      options?: {
        messageKey?: string;
        messageOptions?: Record<string, unknown>;
        messageText?: string;
        bleErrorCode?: string;
      },
    ) => {
      setWorkflowModal({
        visible: true,
        kind: 'error',
        titleKey,
        messageKey: options?.messageKey,
        messageOptions: options?.messageOptions,
        messageText: options?.messageText,
        bleErrorCode: options?.bleErrorCode,
        progress: null,
      });
    },
    [],
  );

  useEffect(() => {
    setBytecodePath(null);
    setBytecodeSize(null);
    setBytecodeHexPreview('');
    setWorkflowModal(CLOSED_WORKFLOW_MODAL);
  }, [generatedCode]);

  const handleCompileAndUploadToHost = useCallback(
    async (runAfterUpload: boolean) => {
      if (!isBleConnected) {
        showErrorModal('pika.cannotOperate', {
          messageKey: 'pika.notConnectedHost',
        });
        return;
      }

      const hostFileName = buildHostBytecodeFileName(programSlot);
      setActiveHostAction(runAfterUpload ? 'run' : 'download');

      setPikaAction('compiling');
      showProgressModal('pika.compilingTitle', 'pika.compilingMessage');

      try {
        const outcome = await compileGeneratedCode(generatedCode);
        if (!outcome.ok || !outcome.bytecodePath) {
          showErrorModal('pika.compileFailed', {
            messageKey: outcome.message ? undefined : 'pika.compileFailed',
            messageText: outcome.message || undefined,
          });
          return;
        }

        setBytecodePath(outcome.bytecodePath);
        setBytecodeSize(outcome.bytecodeSize);
        setBytecodeHexPreview(outcome.hexPreview);

        setPikaAction('uploading');
        const transferOptions = {
          bytecodeSize: outcome.bytecodeSize,
          hexPreview: outcome.hexPreview,
          runAfterUpload,
          fileName: hostFileName,
        };
        showProgressModal(
          'pika.transferringTitle',
          'pika.transferringMessage',
          transferOptions,
          0,
        );

        const uploadedFileName = await uploadBytecodeToHost({
          bytecodePath: outcome.bytecodePath,
          programSlot,
          runAfterUpload,
          onProgress: progress => {
            showProgressModal(
              'pika.transferringTitle',
              'pika.transferringMessage',
              transferOptions,
              progress,
            );
          },
        });

        showSuccessModal(
          runAfterUpload ? 'pika.runSuccess' : 'pika.downloadSuccess',
          runAfterUpload ? 'pika.runSuccessMessage' : 'pika.downloadSuccessMessage',
          { fileName: uploadedFileName },
        );
      } catch (error) {
        showErrorModal(
          runAfterUpload ? 'pika.runFailed' : 'pika.downloadFailed',
          {
            bleErrorCode:
              error instanceof Error ? error.message : undefined,
          },
        );
      } finally {
        setPikaAction('idle');
        setActiveHostAction(null);
      }
    },
    [
      generatedCode,
      isBleConnected,
      programSlot,
      showErrorModal,
      showProgressModal,
      showSuccessModal,
    ],
  );

  const handleRunOnHost = useCallback(
    () => handleCompileAndUploadToHost(true),
    [handleCompileAndUploadToHost],
  );

  const handleDownloadToHost = useCallback(
    () => handleCompileAndUploadToHost(false),
    [handleCompileAndUploadToHost],
  );

  const handlePauseHost = useCallback(async () => {
    if (!isBleConnected) {
      showErrorModal('pika.cannotPause', {
        messageKey: 'pika.notConnectedHost',
      });
      return;
    }
    setPikaAction('running');
    setActiveHostAction('pause');
    showProgressModal('pika.pausingTitle', 'pika.pausingMessage');

    try {
      await stopHostApp();
      showSuccessModal('pika.pausedTitle', 'pika.pausedMessage');
    } catch (error) {
      showErrorModal('pika.pauseFailed', {
        messageKey: error instanceof Error ? undefined : 'pika.pauseFailed',
        messageText:
          error instanceof Error ? error.message : undefined,
      });
    } finally {
      setPikaAction('idle');
      setActiveHostAction(null);
    }
  }, [isBleConnected, showErrorModal, showProgressModal, showSuccessModal]);

  const isPikaBusy = pikaAction !== 'idle';
  const canHostAction = isBleConnected && !isPikaBusy;

  return {
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
  };
}