import React from 'react';
import { Text, View } from 'react-native';

import { useRuntimeStore } from '../../store/useRuntimeStore';
import { styles } from './RuntimeScreen.styles';

export function RuntimeScreen() {
  const workflowPhase = useRuntimeStore(state => state.workflowPhase);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Pika workflow: {workflowPhase}</Text>
    </View>
  );
}