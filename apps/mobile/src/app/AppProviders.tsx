import React, { useEffect, type PropsWithChildren } from 'react';
import { StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { preloadBuildGuideRuntime } from '../features/buildGuide/preloadBuildGuideRuntime';
import { provisionBuildGuideProjects } from '../features/buildGuide/provisionBuildGuideProjects';
import {
  BleStoreBootstrap,
  bleDeviceManager,
  destroySharedBleManager,
} from '../services/ble';
import { useProjectStore } from '../store/useProjectStore';

export function AppProviders({ children }: PropsWithChildren) {
  useEffect(() => {
    // 启动时补齐内置模型对应的固定项目；完成后刷新作品列表。
    // 幂等：已存在的项目不会被覆盖，也不会重复新增。
    let cancelled = false;
    void provisionBuildGuideProjects()
      .then(() => {
        if (!cancelled) {
          void useProjectStore.getState().loadProjects();
        }
      })
      .catch(() => undefined);

    // HomeScreen has a short initial loading state; use that idle window to
    // prepare the first build-guide navigation instead of doing it on tap.
    const timer = setTimeout(() => {
      preloadBuildGuideRuntime().catch(() => undefined);
    }, 250);

    // 显式初始化共享 BleManager（模块级单例在首次 import 时已创建，此处明确生命周期起点）
    bleDeviceManager.getManager();
    return () => {
      cancelled = true;
      clearTimeout(timer);
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