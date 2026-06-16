import React, { type PropsWithChildren } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { BleStoreBootstrap } from '../services/ble/BleStoreBootstrap';

export function AppProviders({ children }: PropsWithChildren) {
  return (
    <SafeAreaProvider>
      <BleStoreBootstrap />
      {children}
    </SafeAreaProvider>
  );
}
