import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from '@scratch-mobile/i18n';

import { useBleStore } from '../../store/useBleStore';
import { colors, fontSize, fontWeight } from '../../theme';
import {
  getBatteryStatusColor,
  parseBatteryPercent,
} from './deviceWatchDisplay';

export function BatteryStatusLight() {
  const { t } = useTranslation('editorShell');
  const isConnected = useBleStore(state => state.connectionStatus) === 'connected';
  const battery = useBleStore(state => state.deviceWatch?.adc?.bat ?? null);
  const hasData = useBleStore(state => state.deviceWatch != null);
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
          ? t('battery.notConnected')
          : percent !== null
            ? t('battery.percent', { percent })
            : t('battery.waitingData')
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
