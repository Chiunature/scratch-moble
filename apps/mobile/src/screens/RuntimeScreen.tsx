import React from 'react';
import { Button, StyleSheet, Text, View } from 'react-native';
import { formatRuntimeTicks } from '@scratch-mobile/core';

import { useRuntimeStore } from '../store/useRuntimeStore';

export function RuntimeScreen() {
  const ticks = useRuntimeStore(state => state.ticks);
  const increment = useRuntimeStore(state => state.increment);
  const reset = useRuntimeStore(state => state.reset);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{formatRuntimeTicks(ticks)}</Text>
      <View style={styles.actions}>
        <Button title="Tick" onPress={increment} />
        <Button title="Reset" onPress={reset} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    gap: 16,
    justifyContent: 'center',
    padding: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
  },
  actions: {
    gap: 12,
  },
});
