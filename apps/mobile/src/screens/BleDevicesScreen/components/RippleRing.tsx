import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Easing } from 'react-native';

/** 单个波纹从出现到消失的总时长 */
const RIPPLE_DURATION_MS = 2800;
/** 每隔多久生成一个新波纹（小于 DURATION 时，屏幕上会同时存在多个环） */
const RIPPLE_SPAWN_INTERVAL_MS = 900;

type RippleRingProps = {
  id: number;
  onComplete: (id: number) => void;
};

/**
 * 单个波纹环：只播放一次，扩散后通知父组件移除。
 * 不复位、不循环，模拟水波向外扩散后消失。
 */
function RippleRing({ id, onComplete }: RippleRingProps) {
  const scale = useRef(new Animated.Value(0.5)).current;
  const opacity = useRef(new Animated.Value(0.6)).current;

  useEffect(() => {
    const anim = Animated.parallel([
      // 持续向外扩散
      Animated.timing(scale, {
        toValue: 2.2,
        duration: RIPPLE_DURATION_MS,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      // 生成时即全显，随扩散同步淡出
      Animated.timing(opacity, {
        toValue: 0,
        duration: RIPPLE_DURATION_MS,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
    ]);

    anim.start(({ finished }) => {
      if (finished) {
        onComplete(id);
      }
    });

    return () => anim.stop();
  }, [id, onComplete, opacity, scale]);

  return (
    <Animated.View
      style={{
        position: 'absolute',
        width: 80,
        height: 80,
        borderRadius: 40,
        borderWidth: 1,
        borderColor: '#007aff',
        transform: [{ scale }],
        opacity,
      }}
    />
  );
}

type RippleEffectProps = {
  /** 为 true 时持续生成新波纹，为 false 时清空 */
  active: boolean;
};

/**
 * 波纹发射器：定时创建新的 RippleRing 实例。
 * 每个实例独立动画、结束后自动销毁，实现持续水波效果。
 */
function RippleEffect({ active }: RippleEffectProps) {
  const [ripples, setRipples] = useState<number[]>([]);
  const nextIdRef = useRef(0);

  useEffect(() => {
    if (!active) {
      setRipples([]);
      return;
    }

    const spawn = () => {
      const id = nextIdRef.current;
      nextIdRef.current += 1;
      setRipples(prev => [...prev, id]);
    };

    spawn(); // 激活时立即生成第一个波纹
    const interval = setInterval(spawn, RIPPLE_SPAWN_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [active]);

  const removeRipple = useCallback((id: number) => {
    setRipples(prev => prev.filter(rippleId => rippleId !== id));
  }, []);

  return (
    <>
      {ripples.map(id => (
        <RippleRing key={id} id={id} onComplete={removeRipple} />
      ))}
    </>
  );
}

export { RippleEffect };
