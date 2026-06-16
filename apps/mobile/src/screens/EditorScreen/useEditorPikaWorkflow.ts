import { useCallback, useEffect, useState } from 'react';

import {
  buildHostBytecodeFileName,
  HOST_PROGRAM_SLOT_DEFAULT,
  HOST_PROGRAM_SLOT_MAX,
  HOST_PROGRAM_SLOT_MIN,
  mapBleUploadErrorMessage,
  uploadBytecodeToHost,
} from '../../services/ble';
import { useBleStore } from '../../store/useBleStore';
import {
  compileGeneratedCode,
  runCompiledBytecode,
  runGeneratedCode,
} from '../../services/pika';

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
 *     → 主机文件 {slot}.o（默认 0.o）
 *
 * 代码变更后会自动作废本地编译结果，需重新点「编译」再上传。
 */

export type PikaActionState = 'idle' | 'compiling' | 'running' | 'uploading';

export type PikaStatusKind = 'idle' | 'success' | 'error';

type PikaFeedback = 'compile' | 'run' | 'idle';

function formatPikaStatus(
  action: PikaActionState,
  feedback: PikaFeedback,
  message: string,
  bytecodeSize: number | null,
  hexPreview: string,
): string {
  if (action === 'compiling') {
    return '正在编译…';
  }
  if (action === 'running') {
    return '正在运行…';
  }
  if (action === 'uploading') {
    return message || '正在上传到主机…';
  }
  // 运行结果或错误优先展示 message
  if (feedback === 'run' || feedback === 'idle') {
    return message || '等待编译';
  }
  // 编译成功后展示字节码摘要（magic 前缀用于快速确认格式）
  if (bytecodeSize != null && bytecodeSize > 0) {
    const preview = hexPreview ? `，前缀 ${hexPreview}` : '';
    return `编译成功：${bytecodeSize} 字节${preview}`;
  }
  return message || '等待编译';
}

export function useEditorPikaWorkflow(generatedCode: string) {
  const connectionStatus = useBleStore(state => state.connectionStatus);
  const isBleConnected = connectionStatus === 'connected';

  const [pikaAction, setPikaAction] = useState<PikaActionState>('idle');
  const [pikaStatusMessage, setPikaStatusMessage] = useState('等待编译');
  const [pikaStatusKind, setPikaStatusKind] = useState<PikaStatusKind>('idle');
  const [bytecodePath, setBytecodePath] = useState<string | null>(null);
  const [bytecodeSize, setBytecodeSize] = useState<number | null>(null);
  const [bytecodeHexPreview, setBytecodeHexPreview] = useState('');
  const [pikaFeedback, setPikaFeedback] = useState<PikaFeedback>('idle');
  const [programSlot, setProgramSlot] = useState(HOST_PROGRAM_SLOT_DEFAULT);

  // 源码变化时作废已编译字节码，避免上传过期程序
  useEffect(() => {
    setBytecodePath(null);
    setBytecodeSize(null);
    setBytecodeHexPreview('');
    setPikaStatusKind('idle');
    setPikaStatusMessage('代码已更新，请重新编译');
    setPikaFeedback('idle');
  }, [generatedCode]);

  const handleCompile = useCallback(async () => {
    setPikaAction('compiling');
    setPikaStatusKind('idle');
    setPikaStatusMessage('正在编译…');
    try {
      const outcome = await compileGeneratedCode(generatedCode);
      setPikaStatusKind(outcome.ok ? 'success' : 'error');
      setPikaStatusMessage(outcome.message);
      setBytecodePath(outcome.bytecodePath);
      setBytecodeSize(outcome.ok ? outcome.bytecodeSize : null);
      setBytecodeHexPreview(outcome.ok ? outcome.hexPreview : '');
      setPikaFeedback(outcome.ok ? 'compile' : 'idle');
    } catch (error) {
      setPikaStatusKind('error');
      setPikaStatusMessage(
        error instanceof Error ? error.message : '编译失败',
      );
      setBytecodePath(null);
      setBytecodeSize(null);
      setBytecodeHexPreview('');
      setPikaFeedback('idle');
    } finally {
      setPikaAction('idle');
    }
  }, [generatedCode]);

  const handleRunSource = useCallback(async () => {
    setPikaAction('running');
    setPikaStatusKind('idle');
    setPikaStatusMessage('正在运行源码…');
    setPikaFeedback('run');
    try {
      const outcome = await runGeneratedCode(generatedCode);
      setPikaStatusKind(outcome.ok ? 'success' : 'error');
      setPikaStatusMessage(
        outcome.ok
          ? '源码运行完成（print 输出见终端 logcat）'
          : outcome.message,
      );
    } catch (error) {
      setPikaStatusKind('error');
      setPikaStatusMessage(
        error instanceof Error ? error.message : '运行失败',
      );
    } finally {
      setPikaAction('idle');
    }
  }, [generatedCode]);

  const handleRunBytecode = useCallback(async () => {
    if (!bytecodePath) {
      setPikaStatusKind('error');
      setPikaStatusMessage('请先编译生成字节码');
      return;
    }

    setPikaAction('running');
    setPikaStatusKind('idle');
    setPikaStatusMessage('正在运行字节码…');
    setPikaFeedback('run');
    try {
      const outcome = await runCompiledBytecode(bytecodePath);
      setPikaStatusKind(outcome.ok ? 'success' : 'error');
      setPikaStatusMessage(
        outcome.ok
          ? '字节码运行完成（print 输出见终端 logcat）'
          : outcome.message,
      );
    } catch (error) {
      setPikaStatusKind('error');
      setPikaStatusMessage(
        error instanceof Error ? error.message : '运行失败',
      );
    } finally {
      setPikaAction('idle');
    }
  }, [bytecodePath]);

  const handleUploadToHost = useCallback(async () => {
    if (!bytecodePath) {
      setPikaStatusKind('error');
      setPikaStatusMessage('请先编译生成字节码');
      return;
    }

    if (!isBleConnected) {
      setPikaStatusKind('error');
      setPikaStatusMessage('未连接主机，请先在蓝牙设备页连接 Spark_AI');
      return;
    }

    const hostFileName = buildHostBytecodeFileName(programSlot);
    setPikaAction('uploading');
    setPikaStatusKind('idle');
    setPikaStatusMessage(`正在上传到主机 ${hostFileName}…`);
    setPikaFeedback('idle');

    try {
      const uploadedFileName = await uploadBytecodeToHost({
        bytecodePath,
        programSlot,
        onProgress: progress => {
          setPikaStatusMessage(`正在上传到主机 ${hostFileName}… ${progress}%`);
        },
      });
      setPikaStatusKind('success');
      setPikaStatusMessage(`已上传到主机（${uploadedFileName}）`);
    } catch (error) {
      setPikaStatusKind('error');
      setPikaStatusMessage(mapBleUploadErrorMessage(error));
    } finally {
      setPikaAction('idle');
    }
  }, [bytecodePath, isBleConnected, programSlot]);

  const isPikaBusy = pikaAction !== 'idle';
  const canUploadToHost = Boolean(bytecodePath) && isBleConnected && !isPikaBusy;
  const statusText = formatPikaStatus(
    pikaAction,
    pikaFeedback,
    pikaStatusMessage,
    bytecodeSize,
    bytecodeHexPreview,
  );

  return {
    pikaAction,
    pikaStatusKind,
    statusText,
    bytecodePath,
    programSlot,
    setProgramSlot,
    isBleConnected,
    isPikaBusy,
    canUploadToHost,
    handleCompile,
    handleRunSource,
    handleRunBytecode,
    handleUploadToHost,
    hostProgramSlotMin: HOST_PROGRAM_SLOT_MIN,
    hostProgramSlotMax: HOST_PROGRAM_SLOT_MAX,
  };
}
