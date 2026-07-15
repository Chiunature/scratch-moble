import React from 'react';
import { Text, View } from 'react-native';
import { type NativeStackScreenProps } from '@react-navigation/native-stack';

import { type RootStackParamList } from '../../app/navigation';
import { styles } from './PlaceholderScreen.styles';

type PlaceholderRouteName = 'RemoteControl' | 'AiChat';
type Props = NativeStackScreenProps<RootStackParamList, PlaceholderRouteName>;

const pageCopy: Record<
  PlaceholderRouteName,
  { title: string; body: string }
> = {
  RemoteControl: {
    title: '遥控模式',
    body: '已迁移至独立页面。',
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
