import React from 'react';
import { Pressable, Text, View } from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

import { colors } from '../../../theme';
import { styles } from './BuildGuideSettingsModal.styles';

type PreviewProps = {
  selected?: boolean;
};

/** 高对比：深色积木 + 白/黑硬边 */
export function LineContrastHighPreview({ selected }: PreviewProps) {
  const stroke = selected ? colors.primary : '#94a3b8';
  return (
    <Svg width={56} height={44} viewBox="0 0 56 44">
      <Rect x={6} y={10} width={14} height={10} rx={1.5} fill="#b91c1c" stroke={stroke} strokeWidth={1.6} />
      <Rect x={21} y={10} width={14} height={10} rx={1.5} fill="#78350f" stroke="#fff" strokeWidth={1.8} />
      <Rect x={36} y={10} width={14} height={10} rx={1.5} fill="#111827" stroke="#fff" strokeWidth={1.8} />
      <Rect x={14} y={22} width={14} height={10} rx={1.5} fill="#1d4ed8" stroke="#fff" strokeWidth={1.8} />
      <Rect x={29} y={22} width={14} height={10} rx={1.5} fill="#15803d" stroke="#111" strokeWidth={1.6} />
    </Svg>
  );
}

/** 标准 LDraw：柔和同色边 */
export function LineContrastLdrawPreview({ selected }: PreviewProps) {
  return (
    <Svg width={56} height={44} viewBox="0 0 56 44">
      <Rect x={6} y={10} width={14} height={10} rx={1.5} fill="#ef4444" stroke="#991b1b" strokeWidth={1.2} />
      <Rect x={21} y={10} width={14} height={10} rx={1.5} fill="#a16207" stroke="#713f12" strokeWidth={1.2} />
      <Rect x={36} y={10} width={14} height={10} rx={1.5} fill="#334155" stroke="#0f172a" strokeWidth={1.2} />
      <Rect x={14} y={22} width={14} height={10} rx={1.5} fill="#3b82f6" stroke="#1e40af" strokeWidth={1.2} />
      <Rect x={29} y={22} width={14} height={10} rx={1.5} fill="#22c55e" stroke="#166534" strokeWidth={1.2} />
      {selected ? (
        <Rect x={2} y={6} width={52} height={32} rx={6} fill="none" stroke={colors.primary} strokeWidth={1.5} />
      ) : null}
    </Svg>
  );
}

export function StudSolidPreview({ selected }: PreviewProps) {
  return (
    <Svg width={56} height={44} viewBox="0 0 56 44">
      <Circle cx={28} cy={22} r={14} fill="#0f172a" />
      <Circle cx={28} cy={22} r={14} fill="none" stroke={selected ? colors.primary : '#64748b'} strokeWidth={2} />
    </Svg>
  );
}

export function StudHollowPreview({ selected }: PreviewProps) {
  return (
    <Svg width={56} height={44} viewBox="0 0 56 44">
      <Circle cx={28} cy={22} r={14} fill="none" stroke={selected ? colors.primary : '#64748b'} strokeWidth={3} />
      <Circle cx={28} cy={22} r={7} fill="none" stroke={selected ? colors.primary : '#94a3b8'} strokeWidth={2} />
    </Svg>
  );
}

export function HighlightRedPreview({ selected }: PreviewProps) {
  return (
    <Svg width={56} height={44} viewBox="0 0 56 44">
      <Rect x={10} y={12} width={36} height={20} rx={3} fill="#94a3b8" />
      <Rect x={10} y={12} width={36} height={20} rx={3} fill="none" stroke="#dc2626" strokeWidth={3} />
      {selected ? (
        <Rect x={4} y={6} width={48} height={32} rx={6} fill="none" stroke={colors.primary} strokeWidth={1.5} />
      ) : null}
    </Svg>
  );
}

export function HighlightLimePreview({ selected }: PreviewProps) {
  return (
    <Svg width={56} height={44} viewBox="0 0 56 44">
      <Rect x={10} y={12} width={36} height={20} rx={3} fill="#94a3b8" />
      <Rect x={10} y={12} width={36} height={20} rx={3} fill="none" stroke="#22c55e" strokeWidth={3} />
      {selected ? (
        <Rect x={4} y={6} width={48} height={32} rx={6} fill="none" stroke={colors.primary} strokeWidth={1.5} />
      ) : null}
    </Svg>
  );
}

export function HighlightNormalPreview({ selected }: PreviewProps) {
  return (
    <Svg width={56} height={44} viewBox="0 0 56 44">
      <Rect x={8} y={12} width={18} height={20} rx={2} fill="#ef4444" />
      <Rect x={30} y={12} width={18} height={20} rx={2} fill="#3b82f6" />
      {selected ? (
        <Rect x={4} y={6} width={48} height={32} rx={6} fill="none" stroke={colors.primary} strokeWidth={1.5} />
      ) : null}
    </Svg>
  );
}

export function HighlightOldMonoPreview({ selected }: PreviewProps) {
  return (
    <Svg width={56} height={44} viewBox="0 0 56 44">
      <Rect x={6} y={10} width={28} height={24} rx={2} fill="#fef08a" />
      <Rect x={30} y={14} width={18} height={16} rx={2} fill="#ef4444" stroke="#b91c1c" strokeWidth={1} />
      {selected ? (
        <Rect x={2} y={6} width={52} height={32} rx={6} fill="none" stroke={colors.primary} strokeWidth={1.5} />
      ) : null}
    </Svg>
  );
}

export function AnimSlowPreview({ selected }: PreviewProps) {
  return (
    <Svg width={56} height={44} viewBox="0 0 56 44">
      <Path
        d="M12 30c8-16 24-16 32 0"
        fill="none"
        stroke={selected ? '#16a34a' : '#86efac'}
        strokeWidth={3}
        strokeLinecap="round"
      />
      <Path d="M40 26l6 4-7 2" fill={selected ? '#16a34a' : '#86efac'} />
      <Circle cx={16} cy={28} r={3} fill={selected ? colors.primary : '#64748b'} />
    </Svg>
  );
}

export function AnimNormalPreview({ selected }: PreviewProps) {
  return (
    <Svg width={56} height={44} viewBox="0 0 56 44">
      <Path
        d="M14 28c6-10 18-10 24 0"
        fill="none"
        stroke={selected ? colors.primary : '#94a3b8'}
        strokeWidth={3}
        strokeLinecap="round"
      />
      <Path d="M34 24l8 4-8 3" fill={selected ? colors.primary : '#94a3b8'} />
    </Svg>
  );
}

export function AnimOffPreview({ selected }: PreviewProps) {
  return (
    <Svg width={56} height={44} viewBox="0 0 56 44">
      <Path
        d="M12 22h28"
        fill="none"
        stroke={selected ? colors.primary : '#94a3b8'}
        strokeWidth={3}
        strokeLinecap="round"
      />
      <Path d="M34 16l10 6-10 6" fill={selected ? colors.primary : '#94a3b8'} />
    </Svg>
  );
}

type OptionChipProps = {
  selected: boolean;
  label: string;
  onPress: () => void;
  children: React.ReactNode;
};

export function SettingsOptionChip({
  selected,
  label,
  onPress,
  children,
}: OptionChipProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.optionChip,
        selected && styles.optionChipSelected,
        pressed && styles.optionChipPressed,
      ]}
    >
      <View style={styles.preview}>{children}</View>
      <Text style={[styles.optionLabel, selected && styles.optionLabelSelected]}>
        {label}
      </Text>
    </Pressable>
  );
}
