import React, { useEffect, type PropsWithChildren } from 'react';
import { StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import {
  BleStoreBootstrap,
  bleDeviceManager,
  destroySharedBleManager,
} from '../services/ble';

export function AppProviders({ children }: PropsWithChildren) {
  useEffect(() => {
    // 显式初始化共享 BleManager（模块级单例在首次 import 时已创建，此处明确生命周期起点）
    bleDeviceManager.getManager();
    return () => {
      bleDeviceManager.destroy();
      destroySharedBleManager();
    };
  }, []);

  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <BleStoreBootstrap />
        {children}
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});