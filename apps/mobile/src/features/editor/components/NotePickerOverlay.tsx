/**
 * 可切换八度钢琴底部弹窗（RN 原生 UI）。
 * 按下并松开琴键即确认；点击遮罩关闭且不修改值。
 */
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
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

import {
  BLACK_KEY_WHITE_INDEX,
  OCTAVE_SWITCHER_RANGES,
  buildOctaveKeys,
  clampNotePitch,
  octaveIndexForPitch,
  type OctaveKey,
  type RnNotePickerOpenMessage,
} from '@scratch-mobile/shared';

import { fontWeight, spacing } from '../../../theme';
import { useTranslation } from '@scratch-mobile/i18n';

type Props = {
  session: RnNotePickerOpenMessage | null;
  onCommit: (sessionId: string, value: number) => void;
  onClose: (sessionId: string) => void;
};

const ACCENT = '#4fc3f7';
const SHEET_BG = '#1a1a1a';
const PANEL_BG = '#222';
const KEY_WHITE = '#f5f5dc';
const KEY_BLACK = '#0a0a0a';

const SHEET_HEIGHT_RATIO = 0.6;
const KEYBOARD_MIN_HEIGHT = 120;
const KEYBOARD_PADDING = 4;

const KEY_PRESS_SPRING_IN = {
  speed: 65,
  bounciness: 0,
  useNativeDriver: true,
} as const;
const KEY_PRESS_SPRING_OUT = {
  speed: 42,
  bounciness: 7,
  useNativeDriver: true,
} as const;

function useKeyPressAnimation() {
  const pressAnim = useRef(new Animated.Value(0)).current;

  const onPressIn = useCallback(() => {
    Animated.spring(pressAnim, { toValue: 1, ...KEY_PRESS_SPRING_IN }).start();
  }, [pressAnim]);

  const onPressOut = useCallback(() => {
    Animated.spring(pressAnim, { toValue: 0, ...KEY_PRESS_SPRING_OUT }).start();
  }, [pressAnim]);

  const animatedStyle = useMemo(
    () => ({
      transform: [
        {
          translateY: pressAnim.interpolate({
            inputRange: [0, 1],
            outputRange: [0, 5],
          }),
        },
        {
          scale: pressAnim.interpolate({
            inputRange: [0, 1],
            outputRange: [1, 0.985],
          }),
        },
      ],
    }),
    [pressAnim],
  );

  const glowOpacity = useMemo(
    () =>
      pressAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [0, 0.42],
      }),
    [pressAnim],
  );

  return {
    onPressIn,
    onPressOut,
    animatedStyle,
    glowOpacity,
  };
}

/**
 * 白键：只负责背景 + 按压动效 + 触控区域，不含文字。
 * 文字统一在外部 overlay 渲染，彻底避免 glow 层遮挡。
 */
function WhiteKey({
  keyData,
  selected,
  onPressIn,
  onPressOut,
}: {
  keyData: OctaveKey;
  selected: boolean;
  onPressIn: () => void;
  onPressOut: () => void;
}) {
  const { onPressIn: animIn, onPressOut: animOut, animatedStyle, glowOpacity } =
    useKeyPressAnimation();

  return (
    <Animated.View
      style={[styles.whiteKey, selected && styles.whiteKeySelected, animatedStyle]}
    >
      <Animated.View
        pointerEvents="none"
        style={[styles.keyGlow, { opacity: glowOpacity }]}
      />
      <Pressable
        onPressIn={() => {
          animIn();
          onPressIn();
        }}
        onPressOut={() => {
          animOut();
          onPressOut();
        }}
        style={StyleSheet.absoluteFill}
        accessibilityRole="button"
        accessibilityLabel={keyData.displayName}
      />
    </Animated.View>
  );
}

/**
 * 黑键：只负责背景 + 按压动效 + 触控区域，不含文字。
 * 去掉 overflow:hidden，彻底消除 Android 上 glow 盖住文字的问题。
 */
function BlackKey({
  keyData,
  left,
  width,
  selected,
  onPressIn,
  onPressOut,
}: {
  keyData: OctaveKey;
  left: number;
  width: number;
  selected: boolean;
  onPressIn: () => void;
  onPressOut: () => void;
}) {
  const { onPressIn: animIn, onPressOut: animOut, animatedStyle, glowOpacity } =
    useKeyPressAnimation();

  return (
    <Animated.View
      style={[styles.blackKey, { left, width }, selected && styles.blackKeySelected, animatedStyle]}
    >
      <Animated.View
        pointerEvents="none"
        style={[styles.keyGlow, { opacity: glowOpacity }]}
      />
      <Pressable
        onPressIn={() => {
          animIn();
          onPressIn();
        }}
        onPressOut={() => {
          animOut();
          onPressOut();
        }}
        style={StyleSheet.absoluteFill}
        accessibilityRole="button"
        accessibilityLabel={keyData.displayName}
      />
    </Animated.View>
  );
}

function SwitchablePianoKeyboard({
  octave,
  highlightPitch,
  onKeyPressIn,
  onKeyRelease,
}: {
  octave: number;
  highlightPitch: number;
  onKeyPressIn: (pitch: number) => void;
  onKeyRelease: (pitch: number) => void;
}) {
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [whiteRowWidth, setWhiteRowWidth] = useState(0);

  const keys = useMemo(() => buildOctaveKeys(octave), [octave]);
  const whiteKeys = useMemo(() => keys.filter(k => !k.isBlack), [keys]);
  const blackKeys = useMemo(() => keys.filter(k => k.isBlack), [keys]);

  const whiteKeyWidth =
    whiteRowWidth > 0 ? whiteRowWidth / whiteKeys.length : 0;
  const blackKeyWidth = whiteKeyWidth * 0.58;
  const blackKeyHeight = keyboardHeight * 0.58;

  return (
    <View
      style={styles.keyboardWrapper}
      onLayout={e => {
        const h = e.nativeEvent.layout.height;
        if (h > 0 && h !== keyboardHeight) setKeyboardHeight(h);
      }}
    >
      {/* 层 1：白键行 */}
      <View
        style={styles.whiteKeysRow}
        onLayout={e => {
          const w = e.nativeEvent.layout.width;
          if (w > 0 && w !== whiteRowWidth) setWhiteRowWidth(w);
        }}
      >
        {whiteKeys.map(keyData => (
          <WhiteKey
            key={keyData.pitch}
            keyData={keyData}
            selected={highlightPitch === keyData.pitch}
            onPressIn={() => onKeyPressIn(keyData.pitch)}
            onPressOut={() => onKeyRelease(keyData.pitch)}
          />
        ))}
      </View>

      {/* 层 2：黑键（绝对定位，覆盖白键上半部分） */}
      {whiteKeyWidth > 0 && keyboardHeight > 0 && (
        <View
          style={[styles.blackKeysLayer, { width: whiteRowWidth, height: blackKeyHeight }]}
          pointerEvents="box-none"
        >
          {blackKeys.map(keyData => {
            const whiteIdx = BLACK_KEY_WHITE_INDEX[keyData.pitch % 12];
            if (whiteIdx == null) return null;
            const left = whiteIdx * whiteKeyWidth + (whiteKeyWidth - blackKeyWidth) / 2;
            return (
              <BlackKey
                key={keyData.pitch}
                keyData={keyData}
                left={left}
                width={blackKeyWidth}
                selected={highlightPitch === keyData.pitch}
                onPressIn={() => onKeyPressIn(keyData.pitch)}
                onPressOut={() => onKeyRelease(keyData.pitch)}
              />
            );
          })}
        </View>
      )}

      {/* 层 3：白键文字 overlay（pointerEvents none，始终在最上层） */}
      <View style={styles.whiteLabelsOverlay} pointerEvents="none">
        {whiteKeys.map(keyData => {
          const isSelected = highlightPitch === keyData.pitch;
          return (
            <View key={keyData.pitch} style={styles.whiteKeyLabelColumn}>
              <Text
                style={[styles.whiteKeyName, isSelected && styles.whiteKeyNameSelected]}
                numberOfLines={1}
              >
                {keyData.displayName}
              </Text>
              <Text
                style={[styles.whiteKeyPitch, isSelected && styles.whiteKeyPitchSelected]}
              >
                {keyData.pitch}
              </Text>
            </View>
          );
        })}
      </View>

      {/* 层 4：黑键文字 overlay（pointerEvents none，zIndex 高于黑键层） */}
      {whiteKeyWidth > 0 && keyboardHeight > 0 && (
        <View
          style={[styles.blackLabelsOverlay, { width: whiteRowWidth, height: blackKeyHeight }]}
          pointerEvents="none"
        >
          {blackKeys.map(keyData => {
            const whiteIdx = BLACK_KEY_WHITE_INDEX[keyData.pitch % 12];
            if (whiteIdx == null) return null;
            const left = whiteIdx * whiteKeyWidth + (whiteKeyWidth - blackKeyWidth) / 2;
            const isSelected = highlightPitch === keyData.pitch;
            return (
              <View
                key={keyData.pitch}
                style={[styles.blackKeyLabelCell, { left, width: blackKeyWidth }]}
              >
                <Text
                  style={[styles.blackKeyName, isSelected && styles.blackKeyNameSelected]}
                  numberOfLines={1}
                >
                  {keyData.displayName}
                </Text>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}

function OctaveSwitcher({
  activeOctave,
  onSwitch,
  octaveTitles,
}: {
  activeOctave: number;
  onSwitch: (octave: number) => void;
  octaveTitles: string[];
}) {
  return (
    <View style={styles.octaveBtns}>
      {OCTAVE_SWITCHER_RANGES.map((range, idx) => {
        const active = activeOctave === idx;
        return (
          <Pressable
            key={range}
            onPress={() => onSwitch(idx)}
            style={[styles.octaveBtn, active && styles.octaveBtnActive]}
          >
            <Text
              style={[
                styles.octaveBtnTitle,
                active && styles.octaveBtnTitleActive,
              ]}
            >
              {octaveTitles[idx]}
            </Text>
            <Text
              style={[
                styles.octaveBtnRange,
                active && styles.octaveBtnRangeActive,
              ]}
            >
              {range}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function NotePickerOverlay({ session, onCommit, onClose }: Props) {
  const { t } = useTranslation('overlays');
  const { height: screenHeight } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const octaveTitles = [
    t('notePicker.octave1Title'),
    t('notePicker.octave2Title'),
    t('notePicker.octave3Title'),
  ];

  const slideAnim = useRef(new Animated.Value(screenHeight)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const [initialPitch, setInitialPitch] = useState(12);
  const [pressedPitch, setPressedPitch] = useState<number | null>(null);
  const [activeOctave, setActiveOctave] = useState(0);

  const handleKeyPressIn = useCallback((pitch: number) => {
    setPressedPitch(clampNotePitch(pitch));
  }, []);

  const handleKeyRelease = useCallback(
    (pitch: number) => {
      if (!session) {
        return;
      }
      setPressedPitch(null);
      onCommit(session.sessionId, clampNotePitch(pitch));
    },
    [onCommit, session],
  );

  const handleSwitchOctave = useCallback((octave: number) => {
    setActiveOctave(octave);
  }, []);

  useEffect(() => {
    if (!session) {
      slideAnim.setValue(screenHeight);
      fadeAnim.setValue(0);
      setPressedPitch(null);
      return;
    }

    const pitch = clampNotePitch(session.value);
    setInitialPitch(pitch);
    setActiveOctave(octaveIndexForPitch(pitch));
    setPressedPitch(null);

    slideAnim.setValue(screenHeight);
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 260,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- sessionId only
  }, [session?.sessionId, fadeAnim, slideAnim, screenHeight]);

  if (!session) {
    return null;
  }

  const highlightPitch = pressedPitch ?? initialPitch;
  const sheetMaxHeight = screenHeight * SHEET_HEIGHT_RATIO;

  return (
    <Animated.View
      style={[StyleSheet.absoluteFill, styles.root, { opacity: fadeAnim }]}
      pointerEvents="box-none"
    >
      <Pressable
        style={styles.backdrop}
        onPress={() => onClose(session.sessionId)}
      >
        <Animated.View
          style={[styles.sheetWrap, { transform: [{ translateY: slideAnim }] }]}
        >
          <Pressable
            style={[
              styles.sheet,
              {
                height: sheetMaxHeight,
                paddingLeft: insets.left + spacing.sm,
                paddingRight: insets.right + spacing.sm,
                paddingBottom: insets.bottom + spacing.sm,
              },
            ]}
            onPress={e => e.stopPropagation()}
          >
            <View style={styles.toolbar}>
              <OctaveSwitcher
                activeOctave={activeOctave}
                onSwitch={handleSwitchOctave}
                octaveTitles={octaveTitles}
              />
            </View>

            <SwitchablePianoKeyboard
              octave={activeOctave}
              highlightPitch={highlightPitch}
              onKeyPressIn={handleKeyPressIn}
              onKeyRelease={handleKeyRelease}
            />
          </Pressable>
        </Animated.View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: {
    zIndex: 20,
  },
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
  },
  sheetWrap: {
    width: '100%',
  },
  sheet: {
    width: '100%',
    backgroundColor: SHEET_BG,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderTopWidth: 1,
    borderColor: '#444',
    overflow: 'hidden',
    gap: 0,
    flexDirection: 'column',
  },
  toolbar: {
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    backgroundColor: PANEL_BG,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  octaveBtns: {
    flexDirection: 'row',
    gap: 8,
  },
  octaveBtn: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 6,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#444',
    backgroundColor: '#2a2a2a',
    alignItems: 'center',
  },
  octaveBtnActive: {
    backgroundColor: ACCENT,
    borderColor: ACCENT,
    shadowColor: ACCENT,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
    elevation: 4,
  },
  octaveBtnTitle: {
    color: '#aaa',
    fontSize: 13,
    fontWeight: fontWeight.bold,
    textAlign: 'center',
  },
  octaveBtnTitleActive: {
    color: '#111',
  },
  octaveBtnRange: {
    color: '#777',
    fontSize: 10,
    marginTop: 2,
    textAlign: 'center',
  },
  octaveBtnRangeActive: {
    color: 'rgba(17, 17, 17, 0.75)',
  },
  // ── 键盘区域 ──────────────────────────────────────────
  keyboardWrapper: {
    flex: 1,
    minHeight: KEYBOARD_MIN_HEIGHT,
    backgroundColor: PANEL_BG,
    paddingHorizontal: KEYBOARD_PADDING,
  },
  whiteKeysRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    height: '100%',
    width: '100%',
  },
  // ── 白键 ──────────────────────────────────────────────
  whiteKey: {
    flex: 1,
    backgroundColor: KEY_WHITE,
    borderBottomLeftRadius: 5,
    borderBottomRightRadius: 5,
    minWidth: 0,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  whiteKeySelected: {
    borderColor: ACCENT,
  },
  // ── 黑键 ──────────────────────────────────────────────
  blackKeysLayer: {
    position: 'absolute',
    top: 0,
    left: 0,
    zIndex: 10,
  },
  blackKey: {
    position: 'absolute',
    top: 0,
    height: '100%',
    backgroundColor: KEY_BLACK,
    borderBottomLeftRadius: 5,
    borderBottomRightRadius: 5,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'transparent',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.6,
    shadowRadius: 6,
    elevation: 8,
  },
  blackKeySelected: {
    borderColor: ACCENT,
  },
  // ── 按压 glow（白键/黑键通用，absoluteFill，opacity 0→0.4）─
  keyGlow: {
    ...StyleSheet.absoluteFill,
    backgroundColor: ACCENT,
  },
  // ── 白键文字 overlay（层 3，zIndex 20，pointerEvents none）─
  whiteLabelsOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '40%',
    flexDirection: 'row',
    zIndex: 20,
  },
  whiteKeyLabelColumn: {
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingBottom: 8,
    paddingHorizontal: 2,
    minWidth: 0,
  },
  whiteKeyName: {
    fontSize: 12,
    fontWeight: fontWeight.extraBold,
    color: '#333',
  },
  whiteKeyNameSelected: {
    color: '#1460b0',
  },
  whiteKeyPitch: {
    fontSize: 10,
    color: '#999',
    marginTop: 2,
    fontWeight: fontWeight.bold,
  },
  whiteKeyPitchSelected: {
    color: '#1460b0',
  },
  // ── 黑键文字 overlay（层 4，zIndex 21，pointerEvents none）─
  blackLabelsOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    zIndex: 21,
  },
  blackKeyLabelCell: {
    position: 'absolute',
    bottom: 0,
    height: '100%',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingBottom: 8,
  },
  blackKeyName: {
    fontSize: 10,
    fontWeight: fontWeight.bold,
    color: '#ccc',
    textAlign: 'center',
  },
  blackKeyNameSelected: {
    color: ACCENT,
    fontWeight: fontWeight.extraBold,
  },
});
