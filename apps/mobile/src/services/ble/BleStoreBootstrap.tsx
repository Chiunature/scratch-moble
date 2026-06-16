import { useEffect } from 'react';

import { useBleStore } from '../../store/useBleStore';
import { bleDeviceManager, subscribeBluetoothState } from './index';

export function BleStoreBootstrap() {
  useEffect(() => {
    const unsubscribeState = subscribeBluetoothState(state => {
      useBleStore.getState().setBluetoothState(state);
      bleDeviceManager.onBluetoothAdapterStateChanged(state);
    });

    bleDeviceManager.setDeviceStatusCallback(payload => {
      useBleStore.getState().setDeviceWatch(payload);
    });

    return () => {
      unsubscribeState();
    };
  }, []);

  return null;
}
