import React, { useMemo, useRef } from 'react';
import { Animated, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import type { JoystickDirection } from '../type';
import { JOYSTICK, styles } from '../remoteControl.styles';

function clampToCircle(x: number, y: number, maxRadius: number) {
  const distance = Math.hypot(x, y);
  if (distance <= maxRadius) {
    return { x, y };
  }
  const scale = maxRadius / distance;
  return { x: x * scale, y: y * scale };
}

function getDirection(x: number, y: number): JoystickDirection {
  if (Math.hypot(x, y) < 0.5) return 'center';
  return Math.abs(x) > Math.abs(y)
    ? x > 0
      ? 'right'
      : 'left'
    : y > 0
      ? 'bottom'
      : 'top';
}

export type JoystickKnobProps = {
  onDirectionChange?: (direction: JoystickDirection) => void;
};

export function JoystickKnob({ onDirectionChange }: JoystickKnobProps) {
  const pan = useRef(new Animated.ValueXY()).current;
  const onDirectionChangeRef = useRef(onDirectionChange);
  onDirectionChangeRef.current = onDirectionChange;

  const gesture = useMemo(
    () =>
      Gesture.Pan()
        .runOnJS(true)
        .minDistance(0)
        .onUpdate(event => {
          const next = clampToCircle(
            event.translationX,
            event.translationY,
            JOYSTICK.maxTravel,
          );
          pan.setValue(next);
          onDirectionChangeRef.current?.(
            getDirection(
              next.x / JOYSTICK.maxTravel,
              next.y / JOYSTICK.maxTravel,
            ),
          );
        })
        .onFinalize(() => {
          Animated.spring(pan, {
            toValue: { x: 0, y: 0 },
            useNativeDriver: true,
            friction: 6,
            tension: 120,
          }).start();
          onDirectionChangeRef.current?.('center');
        }),
    [pan],
  );

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View
        collapsable={false}
        style={[styles.head, { transform: pan.getTranslateTransform() }]}
      >
        <View style={styles.center} pointerEvents="none">
          <View style={[styles.dot, styles.dotTop]} />
          <View style={[styles.dot, styles.dotLeft]} />
          <View style={[styles.dot, styles.dotRight]} />
          <View style={[styles.dot, styles.dotBottom]} />
        </View>
      </Animated.View>
    </GestureDetector>
  );
}
