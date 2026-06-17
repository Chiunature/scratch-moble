import { useCallback, useEffect, useState } from 'react';

import {
  buildHostBytecodeFileName,
  HOST_PROGRAM_SLOT_DEFAULT,
  mapBleUploadErrorMessage,
  stopHostApp,
  uploadBytecodeToHost,
} from '../../services/ble';
import { useBleStore } from '../../store/useBleStore';
import { compileGeneratedCode } from '../../services/pika';
import type { PikaWorkflowModalState } from './PikaWorkflowModal';

/**
 * 编辑器 PikaScript 工作流（轨道 A 编译 + 轨道 B BLE 上传）。
 *
 * 完整链路：
 *   WebView 积木 codegen
 *     → generatedCode（Python 源码）
 *     → compileGeneratedCode
 *     → 本地 pika-main.py.o（固定路径，每次覆盖）
 *     → uploadBytecodeToHost
 *     → BLE 分包停等 ACK
 *     → 主机文件 {slot}.o（默认 0.o，可选 0-10）
 *
 * 代码变更后会自动作废本地编译缓存，下次运行/下载时会重新编译。
 */

export type PikaActionState = 'idle' | 'compiling' | 'running' | 'uploading';

export type { PikaWorkflowModalState } from './PikaWorkflowModal';

type HostToolbarAction = 'run' | 'download' | 'pause';

const CLOSED_WORKFLOW_MODAL: PikaWorkflowModalState = {
  visible: false,
  kind: 'progress',
  title: '',
  message: '',
  progress: null,
};

function formatCompileSuccessMessage(
  bytecodeSize: number,
  hexPreview: string,
): string {
  const preview = hexPreview ? `\n前缀 ${hexPreview}` : '';
  return `编译成功：${bytecodeSize} 字节${preview}`;
}

export function useEditorPikaWorkflow(generatedCode: string) {
  const connectionStatus = useBleStore(state => state.connectionStatus);
  const isBleConnected = connectionStatus === 'connected';

  const [pikaAction, setPikaAction] = useState<PikaActionState>('idle'); //默认空闲
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
    (title: string, message: string, progress: number | null = null) => {
      setWorkflowModal({
        visible: true,
        kind: 'progress',
        title,
        message,
        progress,
      });
    },
    [],
  );

  const showSuccessModal = useCallback((title: string, message: string) => {
    setWorkflowModal({
      visible: true,
      kind: 'success',
      title,
      message,
      progress: null,
    });
  }, []);

  const showErrorModal = useCallback((title: string, message: string) => {
    setWorkflowModal({
      visible: true,
      kind: 'error',
      title,
      message,
      progress: null,
    });
  }, []);

  // 源码变化时作废已编译字节码，避免上传过期程序
  useEffect(() => {
    setBytecodePath(null);
    setBytecodeSize(null);
    setBytecodeHexPreview('');
    setWorkflowModal(CLOSED_WORKFLOW_MODAL);
  }, [generatedCode]);

  /** 编译 → 上传到主机指定槽位（可选上传后运行） */
  const handleCompileAndUploadToHost = useCallback(
    async (runAfterUpload: boolean) => {
      if (!isBleConnected) {
        showErrorModal('无法操作', '未连接主机，请先在蓝牙设备页连接 Spark_AI');
        return;
      }

      const hostFileName = buildHostBytecodeFileName(programSlot);
      const actionLabel = runAfterUpload ? '运行' : '下载';
      setActiveHostAction(runAfterUpload ? 'run' : 'download');

      setPikaAction('compiling');
      showProgressModal('正在编译', '正在将积木代码编译为字节码…');

      try {
        const outcome = await compileGeneratedCode(generatedCode);
        if (!outcome.ok || !outcome.bytecodePath) {
          showErrorModal('编译失败', outcome.message || '编译失败');
          return;
        }

        setBytecodePath(outcome.bytecodePath);
        setBytecodeSize(outcome.bytecodeSize);
        setBytecodeHexPreview(outcome.hexPreview);

        setPikaAction('uploading');
        showProgressModal(
          '正在传输',
          `${formatCompileSuccessMessage(
            outcome.bytecodeSize,
            outcome.hexPreview,
          )}\n\n正在${actionLabel}到主机 ${hostFileName}…`,
          0,
        );

        const uploadedFileName = await uploadBytecodeToHost({
          bytecodePath: outcome.bytecodePath,
          programSlot,
          runAfterUpload,
          onProgress: progress => {
            showProgressModal(
              '正在传输',
              `${formatCompileSuccessMessage(
                outcome.bytecodeSize,
                outcome.hexPreview,
              )}\n\n正在${actionLabel}到主机 ${hostFileName}…`,
              progress,
            );
          },
        });

        showSuccessModal(
          runAfterUpload ? '运行成功' : '下载成功',
          runAfterUpload
            ? `编译并上传完成，已在主机运行（${uploadedFileName}）`
            : `编译并上传完成（${uploadedFileName}）`,
        );
      } catch (error) {
        showErrorModal(
          runAfterUpload ? '运行失败' : '下载失败',
          mapBleUploadErrorMessage(error),
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

  /** 编译并上传到主机并运行 */
  const handleRunOnHost = useCallback(
    () => handleCompileAndUploadToHost(true),
    [handleCompileAndUploadToHost],
  );

  /** 下载到主机 */
  const handleDownloadToHost = useCallback(
    () => handleCompileAndUploadToHost(false),
    [handleCompileAndUploadToHost],
  );

  /** 暂停主机程序 */
  const handlePauseHost = useCallback(async () => {
    if (!isBleConnected) {
      showErrorModal('无法暂停', '未连接主机，请先在蓝牙设备页连接 Spark_AI');
      return;
    }
    setPikaAction('running');
    setActiveHostAction('pause');
    //设置上面两个状态让菊花图标显示正在暂停主机程序
    showProgressModal('正在暂停', '正在暂停主机程序…');

    try {
      await stopHostApp();
      showSuccessModal('已暂停', '主机程序已暂停');
    } catch (error) {
      showErrorModal(
        '暂停失败',
        error instanceof Error ? error.message : '暂停失败',
      );
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
