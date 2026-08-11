import { useEffect } from 'react';

import { useBleStore } from '../../../store/useBleStore';
import type { BleConnectionPhase } from '../core/phaseMachine';
import { bleDeviceManager, subscribeBluetoothState } from '../core/manager';
import {
  loadPairedDevices,
  subscribePairedDevices,
} from '../storage/pairedDevices';

/**
 * 相位 → store 投影：uploading 仍视为 connected（蓝牙链路未断）。
 * 投影只读 manager/持久化快照，UI 不直接写连接状态。
 */
export function projectPhase(phase: BleConnectionPhase): void {
  const store = useBleStore.getState();

  if (phase === 'connecting') {
    store.applySnapshot({ connectionStatus: 'connecting', isScanning: false });
    return;
  }

  if (phase === 'connected' || phase === 'uploading') {
    store.applySnapshot({
      connectionStatus: 'connected',
      isScanning: false,
      connectedDevice: bleDeviceManager.getConnectedDevice(),
    });
    return;
  }

  if (phase === 'scanning') {
    // 切换设备场景：已连接时扫描仍视为 connected
    store.applySnapshot({
      connectionStatus: bleDeviceManager.isConnected()
        ? 'connected'
        : 'disconnected',
      isScanning: true,
    });
    return;
  }

  // idle / disconnected
  store.applySnapshot({ connectionStatus: 'disconnected', isScanning: false });
  if (phase === 'disconnected') {
    store.applySnapshot({ connectedDevice: null, deviceWatch: null });
  }
}

export function BleStoreBootstrap() {
  useEffect(() => {
    const unsubscribeState = subscribeBluetoothState(state => {
      useBleStore.getState().applySnapshot({ bluetoothState: state });
      bleDeviceManager.onBluetoothAdapterStateChanged(state);
    });

    bleDeviceManager.setDeviceStatusCallback(payload => {
      useBleStore.getState().applySnapshot({ deviceWatch: payload });
    });

    const unsubscribePaired = subscribePairedDevices(list => {
      useBleStore.getState().applySnapshot({ pairedDevices: list });
    });

    const unsubscribePhase = bleDeviceManager.onPhaseChange(projectPhase);
    // 初始同步：模块级单例可能在导入期已建立连接；配对列表来自持久化
    projectPhase(bleDeviceManager.getPhase());
    void loadPairedDevices();

    return () => {
      unsubscribeState();
      unsubscribePhase();
      unsubscribePaired();
    };
  }, []);

  return null;
}