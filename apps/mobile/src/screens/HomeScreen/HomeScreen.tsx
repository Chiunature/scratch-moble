import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Pressable, Text, View } from 'react-native';
import { type NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTranslation } from '@scratch-mobile/i18n';
import { APP_DISPLAY_NAME } from '@scratch-mobile/shared';
import BleIcon from '../../../assets/homeScreen/bleIcon.png';
import LogoIcon from '../../../assets/branding/AppLogo.png';
import { type RootStackParamList } from '../../app/navigation';
import { colors } from '../../theme';
import { styles } from './HomeScreen.styles';

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

const homeCards = [
  { cardKey: 'projects', route: 'Projects' },
  { cardKey: 'buildGuide', route: 'BuildGuide' },
  { cardKey: 'remoteControl', route: 'RemoteControl' },
  { cardKey: 'aiChat', route: 'AiChat' },
] as const;

export function HomeScreen({ navigation }: Props) {
  const { t: tHome } = useTranslation('home');
  const { t: tNav } = useTranslation('navigation');
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
    <View style={styles.container}>
      <View style={styles.header}>
        <Image source={LogoIcon} style={styles.logo} resizeMode="contain" />
        <View style={styles.headerRightView}>
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
            <Text style={styles.settingsText}>{tNav('settings')}</Text>
          </Pressable>
        </View>
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
            <Text style={styles.cardTitle}>
              {tHome(`cards.${card.cardKey}.title`)}
            </Text>
            <Text style={styles.cardSubtitle}>
              {tHome(`cards.${card.cardKey}.subtitle`)}
            </Text>
          </Pressable>
        ))}
      </View>
      <Text style={styles.appName}>{APP_DISPLAY_NAME}</Text>
    </View>
  );
}
