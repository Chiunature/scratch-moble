import React from 'react';
import { Text, View } from 'react-native';
import { type NativeStackScreenProps } from '@react-navigation/native-stack';

import { type RootStackParamList } from '../../app/navigation';
import { styles } from './PlaceholderScreen.styles';

type PlaceholderRouteName = 'BuildGuide' | 'RemoteControl' | 'AiChat';
type Props = NativeStackScreenProps<RootStackParamList, PlaceholderRouteName>;

const pageCopy: Record<PlaceholderRouteName, { title: string; body: string }> =
  {
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
