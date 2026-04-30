import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { type NativeStackScreenProps } from '@react-navigation/native-stack';
import { APP_DISPLAY_NAME } from '@scratch-mobile/shared';

import { type RootStackParamList } from '../app/navigation';

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
          source={require('../../assets/branding/AppLogo.png')}
          style={styles.loadingLogo}
          resizeMode="contain"
        />
        <ActivityIndicator size="large" color="#4f46e5" />
        <Text style={styles.loadingText}>正在进入创作空间...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Image
          source={require('../../assets/branding/AppLogo.png')}
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
            onPress={() => navigation.navigate(card.route)}>
            <Text style={styles.cardTitle}>{card.title}</Text>
            <Text style={styles.cardSubtitle}>{card.subtitle}</Text>
          </Pressable>
        ))}
      </View>
      <Text style={styles.appName}>{APP_DISPLAY_NAME}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 18,
    backgroundColor: '#eef2ff',
  },
  loadingLogo: {
    width: 120,
    height: 120,
  },
  loadingText: {
    color: '#4f46e5',
    fontSize: 18,
    fontWeight: '700',
  },
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    backgroundColor: '#eef2ff',
  },
  header: {
    position: 'absolute',
    top: 20,
    left: 24,
    right: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  logo: {
    width: 76,
    height: 76,
  },
  settingsButton: {
    borderRadius: 999,
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#ffffff',
    shadowColor: '#4f46e5',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 18,
    elevation: 5,
  },
  settingsText: {
    color: '#4f46e5',
    fontSize: 16,
    fontWeight: '800',
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 18,
  },
  card: {
    width: 170,
    height: 132,
    justifyContent: 'center',
    borderRadius: 26,
    padding: 20,
    backgroundColor: '#ffffff',
    shadowColor: '#4f46e5',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.16,
    shadowRadius: 28,
    elevation: 8,
  },
  cardPressed: {
    opacity: 0.78,
    transform: [{ scale: 0.98 }],
  },
  cardTitle: {
    color: '#111827',
    fontSize: 22,
    fontWeight: '900',
  },
  cardSubtitle: {
    marginTop: 10,
    color: '#64748b',
    fontSize: 15,
    fontWeight: '700',
  },
  appName: {
    position: 'absolute',
    bottom: 22,
    color: '#94a3b8',
    fontSize: 13,
    fontWeight: '700',
  },
});
