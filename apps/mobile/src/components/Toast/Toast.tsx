import { useEffect, useRef } from 'react';
import {
  Animated,
  Easing,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { colors, fontSize, fontWeight, shadows, spacing } from '../../theme';

export type ToastKind = 'success' | 'delete' | 'error';

export type ToastState = {
  kind: ToastKind;
  title: string;
  message: string;
} | null;

const DEFAULT_DURATION_MS = 3000;

const KIND_CONFIG: Record<
  ToastKind,
  { icon: string; iconStyle: ViewStyle }
> = {
  success: {
    icon: '✓',
    iconStyle: { backgroundColor: '#dcfce7' },
  },
  delete: {
    icon: '×',
    iconStyle: { backgroundColor: '#fee2e2' },
  },
  error: {
    icon: '!',
    iconStyle: { backgroundColor: '#ffedd5' },
  },
};

type Props = {
  toast: ToastState;
  topInset?: number;
  duration?: number;
  onHidden: () => void;
  style?: StyleProp<ViewStyle>;
};

export function Toast({
  toast,
  topInset = 0,
  duration = DEFAULT_DURATION_MS,
  onHidden,
  style,
}: Props) {
  const translateX = useRef(new Animated.Value(120)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!toast) {
      translateX.setValue(120);
      opacity.setValue(0);
      return;
    }

    Animated.parallel([
      Animated.spring(translateX, {
        toValue: 0,
        friction: 8,
        tension: 80,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start();

    const timer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(translateX, {
          toValue: 120,
          duration: 350,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0,
          duration: 350,
          useNativeDriver: true,
        }),
      ]).start(({ finished }) => {
        if (finished) {
          onHidden();
        }
      });
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, toast, onHidden, opacity, translateX]);

  if (!toast) {
    return null;
  }

  const { icon, iconStyle } = KIND_CONFIG[toast.kind];

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.container,
        { top: topInset + spacing.lg, opacity, transform: [{ translateX }] },
        style,
      ]}
    >
      <View style={[styles.icon, iconStyle]}>
        <Text style={styles.iconText}>{icon}</Text>
      </View>
      <View style={styles.textBlock}>
        <Text style={styles.title}>{toast.title}</Text>
        <Text style={styles.message}>{toast.message}</Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    right: spacing.lg,
    left: spacing.lg,
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
