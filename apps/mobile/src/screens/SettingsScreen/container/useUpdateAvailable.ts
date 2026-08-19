import { useCallback, useRef, useState } from 'react';

import type { AppUpdateInfo, UpdateCheckService } from '../../../services/update';

export type UpdatePhase =
  | { phase: 'idle' }
  | { phase: 'checking' }
  | { phase: 'available'; update: AppUpdateInfo }
  | { phase: 'downloading'; update: AppUpdateInfo; progress: number | null }
  | { phase: 'ready'; update: AppUpdateInfo }
  | { phase: 'failed'; message: string; update?: AppUpdateInfo }
  | { phase: 'dismissed' };

export type UpdateAvailableHookState = {
  phase: UpdatePhase;
  check: () => Promise<void>;
  startDownload: () => Promise<void>;
  retry: () => void;
  dismiss: () => void;
};

function toErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/**
 * 更新可用性状态机：业务数据只存在于 phase 中，UI view 由容器层派生。
 * 数据源通过 service 注入，本 hook 不感知具体来源（远程 API / BLE 固件 / mock）。
 */
export function useUpdateAvailable(
  service: UpdateCheckService,
): UpdateAvailableHookState {
  const [phase, setPhase] = useState<UpdatePhase>({ phase: 'idle' });

  const serviceRef = useRef(service);
  serviceRef.current = service;
  const phaseRef = useRef<UpdatePhase>({ phase: 'idle' });
  phaseRef.current = phase;

  const check = useCallback(async () => {
    setPhase({ phase: 'checking' });
    try {
      const update = await serviceRef.current.checkForUpdate();
      setPhase(
        update === null ? { phase: 'dismissed' } : { phase: 'available', update },
      );
    } catch (error) {
      setPhase({ phase: 'failed', message: toErrorMessage(error) });
    }
  }, []);

  const startDownload = useCallback(async () => {
    const current = phaseRef.current;
    if (current.phase !== 'available') {
      return;
    }

    const { update } = current;
    setPhase({ phase: 'downloading', update, progress: null });
    try {
      await serviceRef.current.downloadUpdate(update);
      setPhase({ phase: 'ready', update });
    } catch (error) {
      setPhase({ phase: 'failed', message: toErrorMessage(error), update });
    }
  }, []);

  const retry = useCallback(() => {
    void check();
  }, [check]);

  const dismiss = useCallback(() => {
    setPhase({ phase: 'dismissed' });
  }, []);

  return {
    phase,
    check,
    startDownload,
    retry,
    dismiss,
  };
}