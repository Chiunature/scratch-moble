import { StyleSheet, Text, View } from 'react-native';

import { colors, fontSize, fontWeight } from '../../theme';
import {
  getBatteryStatusColor,
  parseBatteryPercent,
} from './deviceWatchDisplay';

type Props = {
  battery: string | null;
  isConnected: boolean;
  hasData: boolean;
};

export function BatteryStatusLight({ battery, isConnected, hasData }: Props) {
  const percent = parseBatteryPercent(battery);
  const dotColor = getBatteryStatusColor(percent, isConnected, hasData);
  const label = !isConnected
    ? '—'
    : percent !== null
      ? `${percent}%`
      : hasData
        ? battery ?? '—'
        : '…';

  return (
    <View
      style={styles.root}
      accessibilityRole="text"
      accessibilityLabel={
        !isConnected
          ? '未连接主机'
          : percent !== null
            ? `电量 ${percent}%`
            : '等待电量数据'
      }
    >
      <View style={[styles.dot, { backgroundColor: dotColor }]} />
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 4,
    minWidth: 44,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  label: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    minWidth: 28,
  },
});
