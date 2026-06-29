import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  PanResponder,
  StyleSheet,
  View,
  type LayoutChangeEvent,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useTranslation } from '@scratch-mobile/i18n';

// ==================== 类型定义 ====================

type SliderProps = {
  value: number;
  minimumValue: number;
  maximumValue: number;
  step?: number;
  disabled?: boolean;
  onValueChange?: (value: number) => void;
  onSlidingComplete?: (value: number) => void;
  trackHeight?: number;
  thumbSize?: number;
  minimumTrackTintColor?: string;
  maximumTrackTintColor?: string;
  thumbTintColor?: string;
  style?: StyleProp<ViewStyle>;
};

type TrackLayout = {
  pageX: number;
  width: number;
};

// ==================== 常量 ====================

const DEFAULT_CONFIG = {
  step: 0,
  trackHeight: 6,
  thumbSize: 14,
  minimumTrackTintColor: 'rgba(255,255,255,0.45)',
  maximumTrackTintColor: 'rgba(0,0,0,0.18)',
  thumbTintColor: '#FFFFFF',
} as const;

const HIT_SLOP_EXTENSION = 32;
const MIN_TOUCH_TARGET = 44;

// ==================== 工具函数 ====================

function clamp(value: number, min: number, max: number): number {
  'worklet';
  return Math.min(max, Math.max(min, value));
}

function getDecimalPlaces(num: number): number {
  const str = String(num);
  return str.includes('.') ? str.split('.')[1]?.length ?? 0 : 0;
}

function snapToStep(
  value: number,
  min: number,
  max: number,
  step: number,
): number {
  if (step <= 0) {
    return clamp(value, min, max);
  }

  const steps = Math.round((value - min) / step);
  const snapped = min + steps * step;
  const decimals = getDecimalPlaces(step);

  return clamp(Number(snapped.toFixed(decimals)), min, max);
}

function ratioFromValue(value: number, min: number, max: number): number {
  if (max <= min) {
    return 0;
  }
  return clamp((value - min) / (max - min), 0, 1);
}

function valueFromPosition(
  pageX: number,
  trackLayout: TrackLayout,
  thumbSize: number,
  min: number,
  max: number,
  step: number,
): number {
  const { pageX: trackLeft, width: trackWidth } = trackLayout;

  if (trackWidth <= 0) {
    return min;
  }

  const localX = pageX - trackLeft;
  const availableTravel = Math.max(trackWidth - thumbSize, 1);
  const thumbCenterX = clamp(localX, thumbSize / 2, trackWidth - thumbSize / 2);
  const ratio = (thumbCenterX - thumbSize / 2) / availableTravel;
  const raw = min + ratio * (max - min);

  return snapToStep(raw, min, max, step);
}

// ==================== 自定义 Hook ====================

function useTrackLayout() {
  const trackRef = useRef<View>(null);
  const trackLayoutRef = useRef<TrackLayout>({ pageX: 0, width: 0 });
  const [trackWidth, setTrackWidth] = useState(0);

  const measureLayout = useCallback((onMeasured?: () => void) => {
    trackRef.current?.measureInWindow((pageX, _pageY, width) => {
      trackLayoutRef.current = { pageX, width };
      if (width > 0) {
        setTrackWidth(width);
      }
      onMeasured?.();
    });
  }, []);

  const updateLayoutFromEvent = useCallback((event: LayoutChangeEvent) => {
    const width = event.nativeEvent.layout.width;
    if (width > 0) {
      trackLayoutRef.current.width = width;
      setTrackWidth(width);
    }
  }, []);

  return {
    trackRef,
    trackLayoutRef,
    trackWidth,
    measureLayout,
    updateLayoutFromEvent,
  };
}

function useSliderGesture({
  disabled,
  trackLayoutRef,
  thumbSize,
  minimumValue,
  maximumValue,
  step,
  onValueChange,
  onSlidingComplete,
}: {
  disabled: boolean;
  trackLayoutRef: React.MutableRefObject<TrackLayout>;
  thumbSize: number;
  minimumValue: number;
  maximumValue: number;
  step: number;
  onValueChange?: (value: number) => void;
  onSlidingComplete?: (value: number) => void;
}) {
  const currentValueRef = useRef<number>(0);
  const [isDragging, setIsDragging] = useState(false);

  const calculateValue = useCallback(
    (pageX: number) => {
      return valueFromPosition(
        pageX,
        trackLayoutRef.current,
        thumbSize,
        minimumValue,
        maximumValue,
        step,
      );
    },
    [trackLayoutRef, thumbSize, minimumValue, maximumValue, step],
  );

  const emitValue = useCallback(
    (pageX: number) => {
      if (disabled) return null;

      const next = calculateValue(pageX);
      if (next === currentValueRef.current) return null;

      currentValueRef.current = next;
      onValueChange?.(next);
      return next;
    },
    [disabled, calculateValue, onValueChange],
  );

  const beginDrag = useCallback(
    (pageX: number, onMeasured?: () => void) => {
      setIsDragging(true);
      // 触发测量后再处理值
      if (onMeasured) {
        onMeasured();
        // 测量完成后需要重新计算
        const next = calculateValue(pageX);
        if (next !== currentValueRef.current) {
          currentValueRef.current = next;
          onValueChange?.(next);
        }
      } else {
        emitValue(pageX);
      }
    },
    [calculateValue, emitValue, onValueChange],
  );

  const moveDrag = useCallback(
    (pageX: number) => {
      emitValue(pageX);
    },
    [emitValue],
  );

  const endDrag = useCallback(() => {
    setIsDragging(false);
    onSlidingComplete?.(currentValueRef.current);
  }, [onSlidingComplete]);

  const updateCurrentValue = useCallback(
    (value: number) => {
      if (!isDragging) {
        currentValueRef.current = value;
      }
    },
    [isDragging],
  );

  return {
    currentValueRef,
    isDragging,
    beginDrag,
    moveDrag,
    endDrag,
    updateCurrentValue,
  };
}

// ==================== 组件 ====================

export function BubbleSlider({
  value,
  minimumValue,
  maximumValue,
  step = DEFAULT_CONFIG.step,
  disabled = false,
  onValueChange,
  onSlidingComplete,
  trackHeight = DEFAULT_CONFIG.trackHeight,
  thumbSize = DEFAULT_CONFIG.thumbSize,
  minimumTrackTintColor = DEFAULT_CONFIG.minimumTrackTintColor,
  maximumTrackTintColor = DEFAULT_CONFIG.maximumTrackTintColor,
  thumbTintColor = DEFAULT_CONFIG.thumbTintColor,
  style,
}: SliderProps) {
  const { t } = useTranslation('overlays');

  // ----- 布局 -----
  const {
    trackRef,
    trackLayoutRef,
    trackWidth,
    measureLayout,
    updateLayoutFromEvent,
  } = useTrackLayout();

  // ----- 手势 -----
  const {
    currentValueRef,
    isDragging,
    beginDrag,
    moveDrag,
    endDrag,
    updateCurrentValue,
  } = useSliderGesture({
    disabled,
    trackLayoutRef,
    thumbSize,
    minimumValue,
    maximumValue,
    step,
    onValueChange,
    onSlidingComplete,
  });

  // ----- 同步外部 value -----
  useEffect(() => {
    updateCurrentValue(value);
  }, [value, updateCurrentValue]);

  // ----- 布局更新时重新测量 -----
  const handleLayout = useCallback(
    (event: LayoutChangeEvent) => {
      updateLayoutFromEvent(event);
      if (!isDragging) {
        measureLayout();
      }
    },
    [isDragging, measureLayout, updateLayoutFromEvent],
  );

  // ----- PanResponder -----
  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => !disabled,
        onMoveShouldSetPanResponder: () => !disabled,
        onPanResponderTerminationRequest: () => false,
        onPanResponderGrant: evt => {
          beginDrag(evt.nativeEvent.pageX, () => {
            // 测量完成后的回调中重新计算值
            const { pageX: trackLeft, width } = trackLayoutRef.current;
            if (width > 0) {
              const next = valueFromPosition(
                evt.nativeEvent.pageX,
                { pageX: trackLeft, width },
                thumbSize,
                minimumValue,
                maximumValue,
                step,
              );
              if (next !== currentValueRef.current) {
                currentValueRef.current = next;
                onValueChange?.(next);
              }
            }
          });
        },
        onPanResponderMove: evt => {
          moveDrag(evt.nativeEvent.pageX);
        },
        onPanResponderRelease: endDrag,
        onPanResponderTerminate: endDrag,
      }),
    [
      disabled,
      beginDrag,
      moveDrag,
      endDrag,
      trackLayoutRef,
      currentValueRef,
      thumbSize,
      minimumValue,
      maximumValue,
      step,
      onValueChange,
    ],
  );

  // ----- 计算样式值 -----
  const renderValue = currentValueRef.current;
  const safeTrackWidth = Math.max(trackWidth, 1);
  const ratio = ratioFromValue(renderValue, minimumValue, maximumValue);
  const availableTravel = Math.max(safeTrackWidth - thumbSize, 0);
  const thumbLeft = ratio * availableTravel;
  const fillWidth = Math.min(thumbLeft + thumbSize, safeTrackWidth);

  const touchHeight = Math.max(
    thumbSize + HIT_SLOP_EXTENSION,
    MIN_TOUCH_TARGET,
  );
  const trackTop = (touchHeight - trackHeight) / 2;
  const thumbTop = (touchHeight - thumbSize) / 2;
  const halfTrackHeight = trackHeight / 2;
  const halfThumbSize = thumbSize / 2;

  // ----- 可访问性 -----
  const accessibilityConfig = useMemo(
    () => ({
      accessible: !disabled,
      accessibilityRole: 'adjustable' as const,
      accessibilityLabel: t('bubbleSlider.accessibilityLabel'),
      accessibilityValue: {
        min: minimumValue,
        max: maximumValue,
        now: renderValue,
      },
      accessibilityHint: t('bubbleSlider.accessibilityHint', {
        value: renderValue,
      }),
    }),
    [disabled, minimumValue, maximumValue, renderValue, t],
  );

  // ==================== 渲染 ====================

  return (
    <View
      ref={trackRef}
      style={[
        styles.root,
        {
          height: touchHeight,
          opacity: disabled ? 0.5 : 1,
        },
        style,
      ]}
      onLayout={handleLayout}
      {...accessibilityConfig}
      {...(disabled ? {} : panResponder.panHandlers)}
    >
      {/* 轨道背景 */}
      <View
        style={[
          styles.track,
          {
            height: trackHeight,
            borderRadius: halfTrackHeight,
            backgroundColor: maximumTrackTintColor,
            top: trackTop,
          },
        ]}
      >
        {/* 已填充部分 */}
        <View
          style={[
            styles.fill,
            {
              width: fillWidth,
              backgroundColor: minimumTrackTintColor,
              borderRadius: halfTrackHeight,
            },
          ]}
        />
      </View>

      {/* 滑块 */}
      <View
        style={[
          styles.thumb,
          {
            width: thumbSize,
            height: thumbSize,
            borderRadius: halfThumbSize,
            backgroundColor: thumbTintColor,
            left: thumbLeft,
            top: thumbTop,
          },
        ]}
      />
    </View>
  );
}

// ==================== 样式 ====================

const styles = StyleSheet.create({
  root: {
    width: '100%',
    justifyContent: 'center',
  },
  track: {
    width: '100%',
    position: 'absolute',
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
  },
  thumb: {
    position: 'absolute',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },
});
