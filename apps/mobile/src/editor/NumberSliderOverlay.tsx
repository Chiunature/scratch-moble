import Slider from '@react-native-community/slider';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
} from 'react-native';

import { colors, fontSize, fontWeight, spacing } from '../theme';
import type { RnNumberSliderOpenMessage } from './editorMessages';

type Props = {
  session: RnNumberSliderOpenMessage | null;
  onValueChange: (sessionId: string, value: number) => void;
  onClose: (sessionId: string) => void;
};

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
  const { width: windowWidth } = useWindowDimensions();
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
      if (!session || liveValueRef.current === next) {
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

  const bubbleWidth = 220;
  const bubbleLeft = Math.max(
    spacing.sm,
    Math.min(
      session.anchor.x + session.anchor.width / 2 - bubbleWidth / 2,
      windowWidth - bubbleWidth - spacing.sm,
    ),
  );
  const bubbleTop = session.anchor.y + session.anchor.height + 8;
  const step = session.step > 0 ? session.step : undefined;

  return (
    <Modal
      transparent
      visible
      animationType="fade"
      onRequestClose={() => onClose(session.sessionId)}
    >
      <Pressable
        style={styles.backdrop}
        onPress={() => onClose(session.sessionId)}
      >
        <Pressable
          style={[
            styles.bubble,
            {
              left: bubbleLeft,
              top: bubbleTop,
              width: bubbleWidth,
              backgroundColor: session.colors.primary,
              // borderColor: session.colors.secondary,
              borderColor: 'red',
            },
          ]}
          onPress={e => e.stopPropagation()}
        >
          <Text style={styles.valueText}>
            {formatDisplayValue(displayValue, session.step)}
          </Text>
          <Slider
            style={styles.slider}
            value={displayValue}
            minimumValue={session.min}
            maximumValue={session.max}
            step={step}
            minimumTrackTintColor="rgba(255,255,255,0.45)"
            maximumTrackTintColor="rgba(0,0,0,0.18)"
            thumbTintColor={colors.surface}
            onValueChange={handleSliderChange}
            onSlidingComplete={finishDrag}
          />
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.12)',
  },
  bubble: {
    position: 'absolute',
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
  slider: {
    width: '100%',
    height: 40,
    borderWidth: 1,
    borderColor: 'blue',
  },
});
