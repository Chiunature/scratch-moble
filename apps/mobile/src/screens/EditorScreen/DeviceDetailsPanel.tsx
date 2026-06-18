import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { ScrollablePanel } from '../../components/ScrollablePanel';
import type { ParsedWatchPort } from '../../services/ble';
import { colors, fontSize, fontWeight, spacing } from '../../theme';
import {
  formatDeviceKindLabel,
  formatPortLabel,
  formatPortReading,
  getBatteryStatusColor,
  parseBatteryPercent,
} from './deviceWatchDisplay';

type Props = {
  isConnected: boolean;
  isAvailable: boolean;
  battery: string | null;
  isProgramRunning: boolean;
  connectedCount: number;
  portCount: number;
  ports: ParsedWatchPort[];
  flashFree: string | null;
  flashTotal: string | null;
  version: number | null;
  heap: string | null;
  onClose: () => void;
};

function PortCard({ port }: { port: ParsedWatchPort }) {
  const isInactive = port.isEmpty;

  return (
    <View style={[styles.portCard, isInactive && styles.portCardInactive]}>
      <View style={styles.portCardHeader}>
        <Text style={[styles.portLabel, isInactive && styles.portTextMuted]}>
          {formatPortLabel(port.port)}
        </Text>
        <Text style={[styles.portKind, isInactive && styles.portTextMuted]}>
          {formatDeviceKindLabel(port.kind)}
        </Text>
      </View>
      {!isInactive ? (
        <Text style={styles.portReading}>{formatPortReading(port)}</Text>
      ) : (
        <Text style={styles.portTextMuted}>未连接</Text>
      )}
    </View>
  );
}

export function DeviceDetailsPanel({
  isConnected,
  isAvailable,
  battery,
  isProgramRunning,
  connectedCount,
  portCount,
  ports,
  flashFree,
  flashTotal,
  version,
  heap,
  onClose,
}: Props) {
  const [systemExpanded, setSystemExpanded] = useState(false);
  const percent = parseBatteryPercent(battery);
  const dotColor = getBatteryStatusColor(percent, isConnected, isAvailable);

  const statusMessage = useMemo(() => {
    if (!isConnected) {
      return '未连接主机\n请先在「蓝牙设备」页连接 Spark_AI';
    }
    if (!isAvailable) {
      return '已连接，等待主机推送传感器数据…';
    }
    return null;
  }, [isAvailable, isConnected]);

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Text style={styles.title}>传感器</Text>
        <Pressable
          onPress={onClose}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel="关闭传感器面板"
        >
          <Text style={styles.closeButton}>×</Text>
        </Pressable>
      </View>

      <View style={styles.summaryStrip}>
        <View style={styles.summaryItem}>
          <View style={[styles.summaryDot, { backgroundColor: dotColor }]} />
          <Text style={styles.summaryValue}>
            {percent !== null ? `${percent}%` : isConnected ? '…' : '—'}
          </Text>
        </View>
        <Text style={styles.summaryMeta}>
          {isProgramRunning ? '运行' : '停止'}
          {' · '}
          {isAvailable ? `${connectedCount}/${portCount}` : '—'} 口
        </Text>
      </View>

      {statusMessage ? (
        <Text style={styles.hint}>{statusMessage}</Text>
      ) : (
        <ScrollablePanel style={styles.scrollBody} contentContainerStyle={styles.scrollContent}>
          {ports.map(port => (
            <PortCard key={`port-${port.port}`} port={port} />
          ))}

          <Pressable
            style={styles.systemToggle}
            onPress={() => setSystemExpanded(open => !open)}
            accessibilityRole="button"
            accessibilityState={{ expanded: systemExpanded }}
          >
            <Text style={styles.systemToggleText}>系统</Text>
            <Text style={styles.systemToggleHint}>{systemExpanded ? '▲' : '▼'}</Text>
          </Pressable>

          {systemExpanded ? (
            <View style={styles.systemBlock}>
              <Text style={styles.systemLine}>
                存储 {flashFree ?? '—'} / {flashTotal ?? '—'}
              </Text>
              <Text style={styles.systemLine}>
                v{version ?? '—'} · 堆 {heap ?? '—'} kb
              </Text>
            </View>
          ) : null}
        </ScrollablePanel>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    minHeight: 0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  title: {
    color: colors.codeText,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.extraBold,
  },
  closeButton: {
    color: colors.primarySoft,
    fontSize: fontSize.xl,
    lineHeight: fontSize.xl,
    fontWeight: fontWeight.bold,
    paddingHorizontal: spacing.xs,
  },
  summaryStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
    paddingBottom: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(165, 180, 252, 0.25)',
  },
  summaryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  summaryDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  summaryValue: {
    color: colors.codeText,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.extraBold,
  },
  summaryMeta: {
    flex: 1,
    color: colors.primarySoft,
    fontSize: fontSize.xs,
  },
  hint: {
    color: colors.primarySoft,
    fontSize: fontSize.xs,
    lineHeight: 18,
  },
  scrollBody: {
    flex: 1,
    minHeight: 0,
  },
  scrollContent: {
    gap: spacing.xs,
    paddingBottom: spacing.md,
  },
  portCard: {
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    borderRadius: spacing.sm,
    padding: spacing.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(165, 180, 252, 0.2)',
  },
  portCardInactive: {
    opacity: 0.5,
  },
  portCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.xs,
  },
  portLabel: {
    color: colors.codeText,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.extraBold,
  },
  portKind: {
    color: colors.primarySoft,
    fontSize: 10,
    fontWeight: fontWeight.bold,
    flexShrink: 1,
    textAlign: 'right',
  },
  portTextMuted: {
    color: colors.textFaint,
    fontSize: fontSize.xs,
  },
  portReading: {
    color: '#86efac',
    fontSize: fontSize.xs,
    marginTop: 4,
    fontFamily: 'monospace',
  },
  systemToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs,
    marginTop: spacing.xs,
  },
  systemToggleText: {
    color: colors.primarySoft,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
  },
  systemToggleHint: {
    color: colors.textFaint,
    fontSize: 10,
  },
  systemBlock: {
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    borderRadius: spacing.sm,
    padding: spacing.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(165, 180, 252, 0.2)',
  },
  systemLine: {
    color: colors.primarySoft,
    fontSize: 10,
    lineHeight: 16,
    fontFamily: 'monospace',
  },
});
