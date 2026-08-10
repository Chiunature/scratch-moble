import { useEffect } from 'react';

import { useBleStore } from '../../../store/useBleStore';
import type { BleConnectionPhase } from '../core/phaseMachine';
import { bleDeviceManager, subscribeBluetoothState } from '../core/manager';

/**
 * 相位 → store 投影：uploading 仍视为 connected（蓝牙链路未断）。
 * 投影只读 manager 快照，UI 不直接写连接状态。
 */
export function projectPhase(phase: BleConnectionPhase): void {
  const store = useBleStore.getState();

  if (phase === 'connecting') {
    store.setConnectionStatus('connecting');
    store.setScanning(false);
    return;
  }

  if (phase === 'connected' || phase === 'uploading') {
    store.setConnectionStatus('connected');
    store.setScanning(false);
    store.setConnectedDevice(bleDeviceManager.getConnectedDevice());
    return;
  }

  if (phase === 'scanning') {
    // 切换设备场景：已连接时扫描仍视为 connected
    store.setConnectionStatus(
      bleDeviceManager.isConnected() ? 'connected' : 'disconnected',
    );
    store.setScanning(true);
    return;
  }

  // idle / disconnected
  store.setConnectionStatus('disconnected');
  store.setScanning(false);
  if (phase === 'disconnected') {
    store.setConnectedDevice(null);
    store.clearDeviceWatch();
  }
}

export function BleStoreBootstrap() {
  useEffect(() => {
    const unsubscribeState = subscribeBluetoothState(state => {
      useBleStore.getState().setBluetoothState(state);
      bleDeviceManager.onBluetoothAdapterStateChanged(state);
    });

    bleDeviceManager.setDeviceStatusCallback(payload => {
      useBleStore.getState().setDeviceWatch(payload);
    });

    const unsubscribePhase = bleDeviceManager.onPhaseChange(projectPhase);
    // 初始同步：模块级单例可能在导入期已建立连接
    projectPhase(bleDeviceManager.getPhase());

    return () => {
      unsubscribeState();
      unsubscribePhase();
    };
  }, []);

  return null;
}