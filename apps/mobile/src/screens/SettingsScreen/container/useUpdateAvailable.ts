import { useCallback, useRef, useState } from 'react';

import type { AppUpdateInfo, DownloadFirmware } from '../../../services/update';

export type UpdatePhase =
  | { phase: 'idle' }
  | { phase: 'available'; update: AppUpdateInfo }
  | { phase: 'downloading'; update: AppUpdateInfo }
  | { phase: 'ready'; update: AppUpdateInfo }
  | { phase: 'failed'; message: string; update?: AppUpdateInfo }
  | { phase: 'dismissed' };

export type UpdateAvailableHookState = {
  phase: UpdatePhase;
  open: () => void;
  startDownload: () => Promise<void>;
  dismiss: () => void;
};

function toErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/**
 * 更新可用性状态机：可用更新由调用方（容器）根据设备版本同步算好后注入。
 * 本 hook 只负责「展示可用更新」与「异步下载」的状态流转，不感知版本比较与数据来源。
 */
export function useUpdateAvailable(
  update: AppUpdateInfo | null,
  downloadFirmware: DownloadFirmware,
): UpdateAvailableHookState {
  const [phase, setPhase] = useState<UpdatePhase>({ phase: 'idle' });

  const updateRef = useRef(update);
  updateRef.current = update;
  const downloadRef = useRef(downloadFirmware);
  downloadRef.current = downloadFirmware;
  const phaseRef = useRef<UpdatePhase>({ phase: 'idle' });
  phaseRef.current = phase;

  const open = useCallback(() => {
    const current = updateRef.current;
    setPhase(
      current === null ? { phase: 'dismissed' } : { phase: 'available', update: current },
    );
  }, []);

  const startDownload = useCallback(async () => {
    const current = phaseRef.current;
    if (current.phase !== 'available') {
      return;
    }

    const { update: target } = current;
    setPhase({ phase: 'downloading', update: target });
    try {
      await downloadRef.current(target);
      setPhase({ phase: 'ready', update: target });
    } catch (error) {
      setPhase({ phase: 'failed', message: toErrorMessage(error), update: target });
    }
  }, []);

  const dismiss = useCallback(() => {
    setPhase({ phase: 'dismissed' });
  }, []);

  return {
    phase,
    open,
    startDownload,
    dismiss,
  };
}