import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  Text,
  View,
  ImageBackground,
  useWindowDimensions,
} from 'react-native';
import { type NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTranslation } from '@scratch-mobile/i18n';
import { APP_DISPLAY_NAME } from '@scratch-mobile/shared';
import BleIcon from '../../../assets/homeScreen/bleIcon.png';
import settingIcon from '../../../assets/background/setting.png';
import LogoIcon from '../../../assets/branding/AppLogo.png';
import homebBG from '../../../assets/background/background.png';
import editorBG from '../../../assets/background/editorBG.png';
import buildGuideBG from '../../../assets/background/buildBG.png';
import remoteControlBG from '../../../assets/background/remoteBG.png';
import aiChatBG from '../../../assets/background/aiBG.png';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { type RootStackParamList } from '../../app/navigation';
import { colors, spacing } from '../../theme';
import { styles } from './HomeScreen.styles';

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

const homeCards = [
  { cardKey: 'projects', route: 'Projects', bgImage: editorBG },
  { cardKey: 'buildGuide', route: 'BuildGuide', bgImage: buildGuideBG },
  {
    cardKey: 'remoteControl',
    route: 'RemoteControl',
    bgImage: remoteControlBG,
  },
  { cardKey: 'aiChat', route: 'AiChat', bgImage: aiChatBG },
] as const;

export function HomeScreen({ navigation }: Props) {
  const { t: tHome } = useTranslation('home');
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [isLoading, setIsLoading] = useState(true);

  // 横屏 4 列、竖屏 2 列；-2% 是给 space-between 留的列间距
  const isLandscape = width > height;
  const columns = isLandscape ? 4 : 2;
  const cardWidth = `${100 / columns - 2}%` as const;

  // 安全区内边距：取「刘海/圆角安全区」与「设计基础间距」的较大值，
  // 保证内容不被刘海、状态栏、home 指示条或横屏侧边挖孔遮挡。
  const safeAreaPadding = {
    paddingTop: Math.max(insets.top, spacing['3xl']),
    paddingBottom: Math.max(insets.bottom, spacing['3xl']),
    paddingLeft: Math.max(insets.left, spacing['3xl']),
    paddingRight: Math.max(insets.right, spacing['3xl']),
  };

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
          source={LogoIcon}
          style={styles.loadingLogo}
          resizeMode="contain"
        />
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>{tHome('loading')}</Text>
      </View>
    );
  }

  return (
    <ImageBackground
      source={homebBG}
      style={[styles.container, safeAreaPadding]}
    >
      <View style={styles.header}>
        <Pressable
          style={styles.bluetoothButton}
          onPress={() => {
            navigation.navigate('BleDevices');
          }}
          accessibilityRole="button"
          accessibilityLabel={tHome('bleAccessibilityLabel')}
        >
          <Image
            source={BleIcon}
            style={styles.bluetoothIcon}
            resizeMode="contain"
          />
        </Pressable>
        <Pressable
          style={styles.settingsButton}
          onPress={() => navigation.navigate('Settings')}
        >
          <Image
            source={settingIcon}
            style={styles.settingIcon}
            resizeMode="contain"
          />
        </Pressable>
      </View>

      <View style={styles.cardRow}>
        {homeCards.map(card => (
          <Pressable
            key={card.route}
            style={({ pressed }) => [
              styles.card,
              { width: cardWidth },
              pressed && styles.cardPressed,
            ]}
            onPress={() => navigation.navigate(card.route)}
          >
            <ImageBackground
              source={card.bgImage}
              style={styles.cardBackground}
              resizeMode="cover"
            >
              <Text style={styles.cardTitle}>
                {tHome(`cards.${card.cardKey}.title`)}
              </Text>
              <Text style={styles.cardSubtitle}>
                {tHome(`cards.${card.cardKey}.subtitle`)}
              </Text>
            </ImageBackground>
          </Pressable>
        ))}
      </View>
      <Text style={styles.appName}>{APP_DISPLAY_NAME}</Text>
    </ImageBackground>
  );
}
