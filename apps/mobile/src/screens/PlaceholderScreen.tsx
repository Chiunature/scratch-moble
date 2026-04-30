import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { type NativeStackScreenProps } from '@react-navigation/native-stack';

import { type RootStackParamList } from '../app/navigation';

type PlaceholderRouteName = 'BuildGuide' | 'RemoteControl' | 'AiChat';
type Props = NativeStackScreenProps<RootStackParamList, PlaceholderRouteName>;

const pageCopy: Record<PlaceholderRouteName, { title: string; body: string }> = {
  BuildGuide: {
    title: '搭建说明',
    body: '这里将承载结构搭建步骤、零件清单和图文引导。',
  },
  RemoteControl: {
    title: '遥控模式',
    body: '这里将接入硬件连接状态、摇杆和动作控制。',
  },
  AiChat: {
    title: 'AI 对话',
    body: '这里将接入智能问答、项目建议和代码解释。',
  },
};

export function PlaceholderScreen({ route }: Props) {
  const copy = pageCopy[route.name];

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{copy.title}</Text>
      <Text style={styles.body}>{copy.body}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
    padding: 32,
    backgroundColor: '#eef2ff',
  },
  title: {
    color: '#111827',
    fontSize: 32,
    fontWeight: '900',
  },
  body: {
    maxWidth: 560,
    color: '#475569',
    fontSize: 18,
    lineHeight: 28,
    textAlign: 'center',
  },
});
