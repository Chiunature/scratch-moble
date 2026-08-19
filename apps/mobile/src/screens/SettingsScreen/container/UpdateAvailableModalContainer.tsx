import { useEffect, useRef } from 'react';

import { useDeviceWatch } from '../../../services/ble';
import { downloadFirmware, resolveFirmwareUpdate } from '../../../services/update';
import { UpdateAvailableModal, type UpdateAvailableModalView } from '../update';
import { useUpdateAvailable, type UpdatePhase } from './useUpdateAvailable';

/**
 * 容器组件：负责"更新弹窗"的编排，不渲染具体业务 UI。
 * - 读取设备上报版本，用纯函数 resolveFirmwareUpdate 算出「是否可升级 + 升级内容」
 * - 响应屏幕传入的显式请求打开弹窗，并把状态机 phase 派生为展示组件需要的 view props
 * 展示组件 UpdateAvailableModal 不感知数据来源与状态机，只消费 view 并回传用户操作。
 */
const getModalView = (phase: UpdatePhase): UpdateAvailableModalView | null => {
  switch (phase.phase) {
    case 'available':
    case 'downloading':
    case 'ready':
    case 'failed': {
      // failed 也保留 view：下载失败时弹窗内容仍在，便于后续接失败重试 UI
      if (!phase.update) {
        return null;
      }
      return {
        currentVersion: phase.update.currentVersion,
        latestVersion: phase.update.latestVersion,
        changelog: phase.update.changelog,
      };
    }
    // idle 阶段没有数据可展示；dismissed 已被用户关闭
    case 'idle':
    case 'dismissed':
      return null;
  }
};

const isModalVisible = (phase: UpdatePhase) => {
  return (
    phase.phase === 'available' ||
    phase.phase === 'downloading' ||
    phase.phase === 'ready'
  );
};

type Props = {
  checkRequestId: number;
};

export const UpdateAvailableModalContainer = ({ checkRequestId }: Props) => {
  const { hostVersion } = useDeviceWatch();
  const update = resolveFirmwareUpdate(hostVersion);
  const { phase, open, startDownload, dismiss } = useUpdateAvailable(
    update,
    downloadFirmware,
  );
  const handledCheckRequestId = useRef(checkRequestId);

  // 响应屏幕的显式点击请求；不在进入设置页时自动弹出，避免打扰用户。
  useEffect(() => {
    if (handledCheckRequestId.current === checkRequestId) {
      return;
    }
    handledCheckRequestId.current = checkRequestId;
    open();
  }, [open, checkRequestId]);

  return (
    <UpdateAvailableModal
      visible={isModalVisible(phase)}
      view={getModalView(phase)}
      downloading={phase.phase === 'downloading'}
      onClose={dismiss}
      onDownload={() => {
        void startDownload();
      }}
      onLater={dismiss}
    />
  );
};