import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Pressable, Text, View } from 'react-native';
import { type NativeStackScreenProps } from '@react-navigation/native-stack';
import { APP_DISPLAY_NAME } from '@scratch-mobile/shared';

import { type RootStackParamList } from '../../app/navigation';
import { colors } from '../../theme';
import { styles } from './HomeScreen.styles';

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

const homeCards = [
  {
    title: '编程模式',
    subtitle: '进入积木编辑器',
    route: 'Editor',
  },
  {
    title: '搭建说明',
    subtitle: '查看结构步骤',
    route: 'BuildGuide',
  },
  {
    title: '遥控模式',
    subtitle: '控制硬件设备',
    route: 'RemoteControl',
  },
  {
    title: 'AI 对话',
    subtitle: '智能问答助手',
    route: 'AiChat',
  },
] as const;

export function HomeScreen({ navigation }: Props) {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 1200);

    return () => clearTimeout(timer);
  }, []);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <Image
          source={require('../../../assets/branding/AppLogo.png')}
          style={styles.loadingLogo}
          resizeMode="contain"
        />
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>正在进入创作空间...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Image
          source={require('../../../assets/branding/AppLogo.png')}
          style={styles.logo}
          resizeMode="contain"
        />
        <Pressable style={styles.settingsButton}>
          <Text style={styles.settingsText}>设置</Text>
        </Pressable>
      </View>

      <View style={styles.cardRow}>
        {homeCards.map(card => (
          <Pressable
            key={card.route}
            style={({ pressed }) => [
              styles.card,
              pressed && styles.cardPressed,
            ]}
            onPress={() => navigation.navigate(card.route)}
          >
            <Text style={styles.cardTitle}>{card.title}</Text>
            <Text style={styles.cardSubtitle}>{card.subtitle}</Text>
          </Pressable>
        ))}
      </View>
      <Text style={styles.appName}>{APP_DISPLAY_NAME}</Text>
    </View>
  );
}
