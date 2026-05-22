import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { RnNumberSliderOpenMessage } from '@scratch-mobile/shared';

import { colors, fontSize, fontWeight, numberSliderBubbleColors, spacing } from '../../../theme';
import { BubbleSlider } from './BubbleSlider';

type Props = {
  session: RnNumberSliderOpenMessage | null;
  onValueChange: (sessionId: string, value: number) => void;
  onClose: (sessionId: string) => void;
};

const BUBBLE_WIDTH = 220;

function formatDisplayValue(value: number, step: number): string {
  if (step >= 1) {
    return String(Math.round(value));
  }
  const decimals = String(step).includes('.')
    ? String(step).split('.')[1]?.length ?? 1
    : 1;
  return value.toFixed(decimals);
}

export function NumberSliderOverlay({
  session,
  onValueChange,
  onClose,
}: Props) {
  const [liveValue, setLiveValue] = useState<number | null>(null);
  const liveValueRef = useRef<number | null>(null);
  const lastSentRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);
  const pendingRef = useRef<{ sessionId: string; value: number } | null>(null);

  useEffect(() => {
    setLiveValue(null);
    liveValueRef.current = null;
    lastSentRef.current = null;
    pendingRef.current = null;
    if (rafRef.current != null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }, [session?.sessionId]);

  const displayValue = liveValue ?? session?.value ?? 0;

  const flushToWeb = useCallback(
    (sessionId: string, value: number) => {
      if (lastSentRef.current === value) {
        return;
      }
      lastSentRef.current = value;
      onValueChange(sessionId, value);
    },
    [onValueChange],
  );

  const scheduleToWeb = useCallback(
    (sessionId: string, value: number) => {
      pendingRef.current = { sessionId, value };
      if (rafRef.current != null) {
        return;
      }
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = null;
        const pending = pendingRef.current;
        if (pending) {
          flushToWeb(pending.sessionId, pending.value);
        }
      });
    },
    [flushToWeb],
  );

  const handleSliderChange = useCallback(
    (next: number) => {
      if (!session) {
        return;
      }
      liveValueRef.current = next;
      setLiveValue(next);
      scheduleToWeb(session.sessionId, next);
    },
    [scheduleToWeb, session],
  );

  const finishDrag = useCallback(() => {
    if (!session) {
      return;
    }
    if (rafRef.current != null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    const finalValue = liveValueRef.current ?? session.value;
    flushToWeb(session.sessionId, finalValue);
  }, [flushToWeb, session]);

  if (!session) {
    return null;
  }

  const step = session.step > 0 ? session.step : undefined;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      <Pressable
        style={styles.backdrop}
        onPress={() => onClose(session.sessionId)}
      >
        <Pressable
          style={[
            styles.bubble,
            {
              width: BUBBLE_WIDTH,
              backgroundColor: numberSliderBubbleColors.primary,
              borderColor: numberSliderBubbleColors.secondary,
            },
          ]}
          onPress={e => e.stopPropagation()}
        >
          <Text style={styles.valueText}>
            {formatDisplayValue(displayValue, session.step)}
          </Text>
          <BubbleSlider
            value={displayValue}
            minimumValue={session.min}
            maximumValue={session.max}
            step={step}
            minimumTrackTintColor="rgba(255,255,255,0.45)"
            maximumTrackTintColor="rgba(0,0,0,0.18)"
            thumbTintColor={colors.surface}
            trackHeight={20}
            thumbSize={20}
            onValueChange={handleSliderChange}
            onSlidingComplete={finishDrag}
          />
        </Pressable>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.12)',
  },
  bubble: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  valueText: {
    color: colors.surface,
    fontSize: fontSize.md,
    fontWeight: fontWeight.extraBold,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
});
