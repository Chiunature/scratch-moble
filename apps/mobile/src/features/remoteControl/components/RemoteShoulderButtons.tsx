import React, { useRef } from 'react';
import { Animated, Text, Vibration, View } from 'react-native';
import { Pressable } from 'react-native-gesture-handler';
import type { ShoulderButton } from '../type';
import { styles } from '../remoteControl.styles';

const SHOULDER_BUTTONS: Array<{
  label: ShoulderButton;
  dockStyle:
    | typeof styles.shoulderDockLeft
    | typeof styles.shoulderDockRight;
}> = [
  { label: 'L', dockStyle: styles.shoulderDockLeft },
  { label: 'R', dockStyle: styles.shoulderDockRight },
];

export type RemoteShoulderButtonsProps = {
  pressedShoulders: ShoulderButton[];
  onPressIn: (button: ShoulderButton) => void;
  onPressOut: (button: ShoulderButton) => void;
};

/** 肩键：左上 L、右上 R（手柄常见布局） */
export function RemoteShoulderButtons({
  pressedShoulders,
  onPressIn,
  onPressOut,
}: RemoteShoulderButtonsProps) {
  const scaleL = useRef(new Animated.Value(1)).current;
  const scaleR = useRef(new Animated.Value(1)).current;
  const scaleByButton = useRef<Record<ShoulderButton, Animated.Value>>({
    L: scaleL,
    R: scaleR,
  }).current;

  const handlePressIn = (scale: Animated.Value) => {
    Animated.spring(scale, {
      toValue: 0.95,
      useNativeDriver: true,
      friction: 6,
      tension: 120,
    }).start();
  };

  const handlePressOut = (scale: Animated.Value) => {
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
      friction: 6,
      tension: 120,
    }).start();
  };

  return (
    <>
      {SHOULDER_BUTTONS.map(button => {
        const scaleRef = scaleByButton[button.label];
        const isPressed = pressedShoulders.includes(button.label);
        return (
          <Animated.View
            key={button.label}
            style={[
              button.dockStyle,
              styles.shoulderButton,
              isPressed && styles.shoulderButtonPressed,
              { transform: [{ scale: scaleRef }] },
            ]}
          >
            <Pressable
              accessibilityState={{ selected: isPressed }}
              style={styles.shoulderButtonHitTarget}
              onPressIn={() => {
                handlePressIn(scaleRef);
                Vibration.vibrate(15);
                onPressIn(button.label);
              }}
              onPressOut={() => {
                handlePressOut(scaleRef);
                onPressOut(button.label);
              }}
            >
              <Text style={styles.rightRemoteText}>{button.label}</Text>
            </Pressable>
          </Animated.View>
        );
      })}
    </>
  );
}
