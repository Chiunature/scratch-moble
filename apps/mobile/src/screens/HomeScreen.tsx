import React from 'react';
import { Button, StyleSheet, Text, View } from 'react-native';
import { type NativeStackScreenProps } from '@react-navigation/native-stack';
import { APP_DISPLAY_NAME } from '@scratch-mobile/shared';
import { createProjectSummary } from '@scratch-mobile/core';
import { encodeDeviceCommand } from '@scratch-mobile/protocol';

import { type RootStackParamList } from '../app/navigation';

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

const demoProject = createProjectSummary('Demo Project');
const demoCommand = encodeDeviceCommand({ command: 'ping' });

export function HomeScreen({ navigation }: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{APP_DISPLAY_NAME}</Text>
      <Text style={styles.body}>Project: {demoProject.name}</Text>
      <Text style={styles.body}>Protocol: {demoCommand}</Text>
      <Button
        title="Open Zustand runtime demo"
        onPress={() => navigation.navigate('Runtime')}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    gap: 12,
    justifyContent: 'center',
    padding: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
  },
  body: {
    fontSize: 16,
  },
});
