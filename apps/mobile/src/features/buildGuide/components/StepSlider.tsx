import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Animated, PanResponder, View } from 'react-native';
import type { LayoutChangeEvent } from 'react-native';

import {
  FILL_CAP_SIZE,
  styles,
  THUMB_EDGE_INSET,
  THUMB_SIZE,
} from './StepSlider.styles';

type StepSliderProps = {
  /** 当前已提交的步骤下标（0 起） */
  currentIndex: number;
  totalSteps: number;
  /** 仅在滑动松手（手势结束）时回调 */
  onSelectStep: (index: number) => void;
  /** 拖动过程中实时回调当前显示下标，用于外部展示同步的数字 */
  onDisplayIndexChange?: (index: number) => void;
  accessibilityLabel?: string;
};

const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(value, max));

const FRAME_WIDTH_EPSILON = 0.5;

export function StepSlider({
  currentIndex,
  totalSteps,
  onSelectStep,
  onDisplayIndexChange,
  accessibilityLabel,
}: StepSliderProps) {
  //设置轨道实际滑动宽度，初始为0
  const [frameWidth, setFrameWidth] = useState(0);
  //当前显示步骤下标，初始为当前已提交步骤
  const [displayIndex, setDisplayIndex] = useState(currentIndex);
  //是否正在拖拽，初始为false
  const [dragging, setDragging] = useState(false);

  //最大步骤下标，初始为总步骤数-1（步骤从1开始，下标从0开始）
  const maxIndex = Math.max(totalSteps - 1, 0);
  const hasNoSteps = totalSteps <= 0;
  const hasSingleStep = totalSteps === 1;

  //把手中心的可移动边界，初始为轨道内边距 + 把手半径
  const minX = THUMB_EDGE_INSET + THUMB_SIZE / 2;
  const getMetricsForFrameWidth = useCallback(
    (width: number) => {
      const frameMaxX = Math.max(
        width - THUMB_EDGE_INSET - THUMB_SIZE / 2,
        minX,
      );

      return {
        maxX: frameMaxX,
        range: frameMaxX - minX,
      };
    },
    [minX],
  );

  // 可滑动距离来自轨道实际宽度，用于步骤下标和拇指中心位置之间的换算。
  const { range } = getMetricsForFrameWidth(frameWidth);

  const translateX = useRef(new Animated.Value(minX)).current;
  // 0% 时用 fill 自身伪造左侧圆，宽度必须等于 fill 的真实高度，即轨道扣掉上下边框后的内径。
  const fillWidth = useMemo(
    () => Animated.add(translateX, FILL_CAP_SIZE - minX),
    [minX, translateX],
  );
  const thumbXRef = useRef(minX);
  const draggingRef = useRef(false);
  const grantXRef = useRef(minX);
  const grantPageXRef = useRef(0);
  const pendingFrameWidthRef = useRef<number | null>(null);

  // 步骤下标 <-> 拇指中心位置 的换算；无步骤时靠左，只有一步时才居中。
  const xForIndex = useCallback(
    (index: number, activeRange = range) => {
      if (hasNoSteps) {
        return minX;
      }

      if (hasSingleStep) {
        return minX + activeRange / 2;
      }

      return minX + (index / maxIndex) * activeRange;
    },
    [hasNoSteps, hasSingleStep, maxIndex, minX, range],
  );

  const indexForX = useCallback(
    (x: number, activeRange = range) =>
      maxIndex === 0 || activeRange <= 0
        ? 0
        : clamp(Math.round(((x - minX) / activeRange) * maxIndex), 0, maxIndex),
    [maxIndex, minX, range],
  );

  const snapTo = useCallback(
    (index: number, activeRange = range) => {
      const x = xForIndex(index, activeRange);
      thumbXRef.current = x;
      translateX.setValue(x);
      setDisplayIndex(index);
      onDisplayIndexChange?.(index);
    },
    [onDisplayIndexChange, range, translateX, xForIndex],
  );

  const handleLayout = useCallback(
    (event: LayoutChangeEvent) => {
      const width = event.nativeEvent.layout.width;

      if (draggingRef.current) {
        pendingFrameWidthRef.current = width;
        return;
      }

      if (Math.abs(width - frameWidth) <= FRAME_WIDTH_EPSILON) {
        return;
      }

      setFrameWidth(width);
    },
    [frameWidth],
  );

  const flushPendingFrameWidth = useCallback(() => {
    const width = pendingFrameWidthRef.current;
    pendingFrameWidthRef.current = null;

    if (width === null || Math.abs(width - frameWidth) <= FRAME_WIDTH_EPSILON) {
      return;
    }

    setFrameWidth(width);
  }, [frameWidth]);

  const getActiveDragMetrics = useCallback(
    () => getMetricsForFrameWidth(pendingFrameWidthRef.current ?? frameWidth),
    [frameWidth, getMetricsForFrameWidth],
  );

  // 外部切步（上一步/下一步/无障碍操作）或轨道尺寸变化时同步拇指位置
  useEffect(() => {
    if (!draggingRef.current) {
      snapTo(currentIndex);
    }
  }, [snapTo, currentIndex]);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true, //手指按下触发
        onMoveShouldSetPanResponder: () => true, //手指移动触发
        //初始化拖拽状态，记录起始位置,触发时机：手指按下
        onPanResponderGrant: event => {
          draggingRef.current = true;
          setDragging(true);
          grantXRef.current = thumbXRef.current;
          grantPageXRef.current = event.nativeEvent.pageX;
        },
        onPanResponderMove: event => {
          const { maxX: activeMaxX, range: activeRange } =
            getActiveDragMetrics();
          const pageDeltaX = event.nativeEvent.pageX - grantPageXRef.current;
          const x = clamp(grantXRef.current + pageDeltaX, minX, activeMaxX);
          thumbXRef.current = x;
          translateX.setValue(x);
          const index = indexForX(x, activeRange);
          setDisplayIndex(index);
          onDisplayIndexChange?.(index);
        },
        onPanResponderRelease: () => {
          const { range: activeRange } = getActiveDragMetrics();
          const index = indexForX(thumbXRef.current, activeRange);
          draggingRef.current = false;
          setDragging(false);
          flushPendingFrameWidth();
          snapTo(index, activeRange);
          onSelectStep(index);
        },
        onPanResponderTerminationRequest: () => false,
        onPanResponderTerminate: () => {
          const { range: activeRange } = getActiveDragMetrics();
          // 手势被打断（来电、系统弹层等）：回退到已提交步骤，不触发切换
          draggingRef.current = false;
          setDragging(false);
          flushPendingFrameWidth();
          snapTo(currentIndex, activeRange);
        },
      }),
    [
      currentIndex,
      flushPendingFrameWidth,
      getActiveDragMetrics,
      indexForX,
      minX,
      onDisplayIndexChange,
      onSelectStep,
      snapTo,
      translateX,
    ],
  );

  const handleAccessibilityAction = useCallback(
    (event: { nativeEvent: { actionName: string } }) => {
      const { actionName } = event.nativeEvent;
      if (actionName === 'increment') {
        onSelectStep(clamp(currentIndex + 1, 0, maxIndex));
      } else if (actionName === 'decrement') {
        onSelectStep(clamp(currentIndex - 1, 0, maxIndex));
      }
    },
    [currentIndex, maxIndex, onSelectStep],
  );

  return (
    <View
      accessible
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="adjustable"
      accessibilityValue={{
        min: 1,
        max: Math.max(totalSteps, 1),
        now: displayIndex + 1,
      }}
      onAccessibilityAction={handleAccessibilityAction}
      style={styles.container}
      {...panResponder.panHandlers}
    >
      <View
        style={styles.sliderFrame}
        onLayout={handleLayout}
      >
        <View style={styles.track}>
          <Animated.View
            pointerEvents="none"
            style={[styles.fill, { width: fillWidth }]}
          />
        </View>
        <Animated.View
          pointerEvents="none"
          style={[
            styles.thumb,
            dragging && styles.thumbActive,
            { transform: [{ translateX }] },
          ]}
        />
      </View>
    </View>
  );
}
