import React from 'react';
import {
  Image,
  StyleSheet,
  Text,
  View,
  type ImageSourcePropType,
  type StyleProp,
  type ImageStyle,
  type ViewStyle,
} from 'react-native';
import Toast, { type ToastConfigParams } from 'react-native-toast-message';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, fontSize, fontWeight, shadows, spacing } from '../../theme';
import type { AppNotificationKind } from './notify';
import SuccessIcon from '../../../assets/notifications/success.png';
import DeleteIcon from '../../../assets/notifications/delete.png';
import ErrorIcon from '../../../assets/notifications/error.png';

type NotificationToastProps = ToastConfigParams<Record<string, never>> & {
  kind: AppNotificationKind;
};

type NotificationIcon =
  | { kind: 'text'; value: string }
  | {
      kind: 'image';
      source: ImageSourcePropType;
      style?: StyleProp<ImageStyle>;
      tintColor?: string;
    };

const KIND_CONFIG: Record<
  AppNotificationKind,
  { icon: NotificationIcon; iconStyle: ViewStyle }
> = {
  success: {
    icon: { kind: 'image', source: SuccessIcon, tintColor: '#10b981' },
    iconStyle: {
      backgroundColor: 'transparent',
    },
  },
  delete: {
    icon: { kind: 'image', source: DeleteIcon, tintColor: '#ef4444' },
    iconStyle: {
      backgroundColor: 'transparent',
    },
  },
  error: {
    icon: { kind: 'image', source: ErrorIcon, tintColor: '#f97316' },
    iconStyle: {
      backgroundColor: 'transparent',
    },
  },
};

const NotificationIconView = ({ icon }: { icon: NotificationIcon }) => {
  if (icon.kind === 'image') {
    return (
      <Image
        source={icon.source}
        style={[styles.iconImage, icon.style]}
        tintColor={icon.tintColor}
        resizeMode="contain"
      />
    );
  }

  return <Text style={styles.iconText}>{icon.value}</Text>;
};

const NotificationToast = ({ kind, text1, text2 }: NotificationToastProps) => {
  const { icon, iconStyle } = KIND_CONFIG[kind];

  return (
    <View style={styles.container}>
      <View style={[styles.icon, iconStyle]} pointerEvents="none">
        <NotificationIconView icon={icon} />
      </View>
      <View style={styles.textBlock} pointerEvents="none">
        {text1 ? <Text style={styles.title}>{text1}</Text> : null}
        {text2 ? <Text style={styles.message}>{text2}</Text> : null}
      </View>
    </View>
  );
};

const toastConfig = {
  appSuccess: (params: ToastConfigParams<Record<string, never>>) => (
    <NotificationToast {...params} kind="success" />
  ),
  appDelete: (params: ToastConfigParams<Record<string, never>>) => (
    <NotificationToast {...params} kind="delete" />
  ),
  appError: (params: ToastConfigParams<Record<string, never>>) => (
    <NotificationToast {...params} kind="error" />
  ),
};

export function NotificationHost() {
  const insets = useSafeAreaInsets();

  return (
    <Toast
      config={toastConfig}
      position="top"
      topOffset={insets.top + spacing.lg}
      visibilityTime={3000}
      swipeable
    />
  );
}

const styles = StyleSheet.create({
  container: {
    width: '92%',
    maxWidth: 560,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: 14,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    ...shadows.primaryMd,
  },
  icon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconText: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.black,
  },
  iconImage: {
    width: 30,
    height: 30,
  },
  textBlock: {
    flex: 1,
  },
  title: {
    color: colors.ink,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.extraBold,
  },
  message: {
    color: colors.textSubtle,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    marginTop: 2,
  },
});
