import React, { useEffect, useRef } from 'react';
import { View, Animated, Easing } from 'react-native';

const BreathingDot = ({ size = 20, color = '#4CAF50', duration = 1500 }) => {
  const opacityAnim = useRef(new Animated.Value(0.3)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    // 呼吸动画循环
    const breathAnimation = () => {
      // 同时执行透明度变化和缩放
      Animated.parallel([
        Animated.sequence([
          Animated.timing(opacityAnim, {
            toValue: 1,
            duration: duration,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(opacityAnim, {
            toValue: 0.75,
            duration: duration,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ]),
        Animated.sequence([
          Animated.timing(scaleAnim, {
            toValue: 1.1,
            duration: duration,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(scaleAnim, {
            toValue: 0.8,
            duration: duration,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ]),
      ]).start(() => breathAnimation()); // 循环
    };

    breathAnimation();

    // 清理动画
    return () => {
      opacityAnim.stopAnimation();
      scaleAnim.stopAnimation();
    };
  }, [opacityAnim, scaleAnim, duration]);

  return (
    <Animated.View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: color,
        opacity: opacityAnim,
        transform: [{ scale: scaleAnim }],
      }}
    />
  );
};
export { BreathingDot };
