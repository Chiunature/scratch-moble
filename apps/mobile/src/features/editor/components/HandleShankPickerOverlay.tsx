/**
 * 手柄按键选择底部弹窗（UI 来自用户提供的 HTML/SVG 源码）。
 * 按下显示反馈，松手后 commit 并关闭；点击遮罩取消。
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { HandleShankKey, RnHandleShankOpenMessage } from '@scratch-mobile/shared';

import { GameControllerSvg } from './GameControllerSvg';

type Props = {
  session: RnHandleShankOpenMessage | null;
  onCommit: (sessionId: string, value: HandleShankKey) => void;
  onClose: (sessionId: string) => void;
};

const SHEET_HEIGHT_RATIO = 0.62;
const SHEET_BG = '#1a1a2e';
const ACCENT = '#64b5f6';

export function HandleShankPickerOverlay({ session, onCommit, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const [pressing, setPressing] = useState<HandleShankKey | null>(null);
  const pendingKeyRef = useRef<HandleShankKey | null>(null);

  const sheetHeight = Math.min(windowHeight * SHEET_HEIGHT_RATIO, 480);
  const translateY = useRef(new Animated.Value(sheetHeight)).current;
  const controllerWidth = Math.min(windowWidth - 12, 540);

  useEffect(() => {
    if (session) {
      setPressing(null);
      pendingKeyRef.current = null;
      Animated.timing(translateY, {
        toValue: 0,
        duration: 220,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(translateY, {
        toValue: sheetHeight,
        duration: 180,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }).start();
    }
  }, [session, sheetHeight, translateY]);

  const handlePressIn = useCallback((key: HandleShankKey) => {
    pendingKeyRef.current = key;
    setPressing(key);
  }, []);

  const handlePressOut = useCallback(
    (key: HandleShankKey) => {
      setPressing(null);
      if (!session || pendingKeyRef.current !== key) {
        pendingKeyRef.current = null;
        return;
      }
      pendingKeyRef.current = null;
      onCommit(session.sessionId, key);
    },
    [session, onCommit],
  );

  const handleClose = useCallback(() => {
    if (!session) return;
    onClose(session.sessionId);
  }, [session, onClose]);

  if (!session) {
    return null;
  }

  return (
    <View style={styles.overlay} pointerEvents="box-none">
      <Pressable style={styles.backdrop} onPress={handleClose} />

      <Animated.View
        style={[
          styles.sheet,
          {
            height: sheetHeight,
            paddingBottom: insets.bottom + 12,
            transform: [{ translateY }],
          },
        ]}
      >
        <Text style={styles.subtitle}>按下并松手即可选择</Text>

        <View style={styles.controllerWrapper}>
          <GameControllerSvg
            width={controllerWidth}
            pressing={pressing}
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
          />
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  sheet: {
    backgroundColor: SHEET_BG,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  subtitle: {
    color: '#888',
    fontSize: 12,
    textAlign: 'center',
    letterSpacing: 1,
    marginTop: 2,
    marginBottom: 12,
  },
  controllerWrapper: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
