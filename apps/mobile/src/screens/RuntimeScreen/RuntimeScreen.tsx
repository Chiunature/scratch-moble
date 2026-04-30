import React from 'react';
import { Button, Text, View } from 'react-native';
import { formatRuntimeTicks } from '@scratch-mobile/core';

import { useRuntimeStore } from '../../store/useRuntimeStore';
import { styles } from './RuntimeScreen.styles';

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
