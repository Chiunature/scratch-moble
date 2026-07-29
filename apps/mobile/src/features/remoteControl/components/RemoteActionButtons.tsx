import React, { useRef } from 'react';
import { Animated, Text, Vibration, View } from 'react-native';
import { Pressable } from 'react-native-gesture-handler';
import type { Direction, RemoteButton } from '../type';
import { styles } from '../remoteControl.styles';

const ACTION_BUTTONS: Array<{
  label: RemoteButton;
  direction: Direction;
}> = [
  { label: 'Y', direction: 'top' },
  { label: 'B', direction: 'left' },
  { label: 'X', direction: 'right' },
  { label: 'A', direction: 'bottom' },
];

function directionStyle(direction: Direction) {
  switch (direction) {
    case 'top':
      return styles.rightRemoteTextContainerTop;
    case 'left':
      return styles.rightRemoteTextContainerLeft;
    case 'right':
      return styles.rightRemoteTextContainerRight;
    case 'bottom':
      return styles.rightRemoteTextContainerBottom;
    default: {
      const _exhaustive: never = direction;
      return _exhaustive;
    }
  }
}

export type RemoteActionButtonsProps = {
  pressedButtons: RemoteButton[];
  onPressIn: (button: RemoteButton) => void;
  onPressOut: (button: RemoteButton) => void;
};

export function RemoteActionButtons({
  pressedButtons,
  onPressIn,
  onPressOut,
}: RemoteActionButtonsProps) {
  const scaleTop = useRef(new Animated.Value(1)).current;
  const scaleLeft = useRef(new Animated.Value(1)).current;
  const scaleRight = useRef(new Animated.Value(1)).current;
  const scaleBottom = useRef(new Animated.Value(1)).current;
  const scaleByDirection = useRef<Record<Direction, Animated.Value>>({
    top: scaleTop,
    left: scaleLeft,
    right: scaleRight,
    bottom: scaleBottom,
  }).current;

  const handlePressIn = (scale: Animated.Value) => {
    Animated.spring(scale, {
      toValue: 0.93,
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
    <View style={styles.rightRemote}>
      {ACTION_BUTTONS.map(button => {
        const scaleRef = scaleByDirection[button.direction];
        const isPressed = pressedButtons.includes(button.label);
        return (
          <Animated.View
            key={button.label}
            style={[
              styles.rightRemoteTextContainer,
              directionStyle(button.direction),
              isPressed && styles.actionButtonPressed,
              { transform: [{ scale: scaleRef }] },
            ]}
          >
            <Pressable
              accessibilityState={{ selected: isPressed }}
              style={styles.actionButtonHitTarget}
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
    </View>
  );
}
