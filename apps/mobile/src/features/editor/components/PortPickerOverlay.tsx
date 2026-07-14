/**
 * 端口选择底部弹窗（RN 原生 UI）。
 *
 * Blockly 通过 maxSelections（1=单选，2=多选）控制；确认回传 "3" 或 "1,2"。
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
  coercePortFieldValue,
  normalizePortValues,
  parsePortFieldValue,
  portModeFromMaxSelections,
  type RnPortPickerOpenMessage,
} from '@scratch-mobile/shared';

import { useDeviceWatch } from '../../../services/ble';
import { fontSize, fontWeight, spacing } from '../../../theme';
import { useTranslation } from '@scratch-mobile/i18n';
import {
  buildPortDefinitions,
  getPortStatusLegend,
  getPortDefinition,
  portPickerTheme,
  type PortConnectionStatus,
  type PortDefinition,
} from '../data/portPickerOptions';

type Props = {
  session: RnPortPickerOpenMessage | null;
  onValueChange: (sessionId: string, value: string) => void;
  onClose: (sessionId: string) => void;
};

const PORT_COLUMNS = 4;
const PORT_GAP = 6;
const PORT_CELL_MAX_SIZE = 38;
const PORT_CELL_SCALE = 0.92;
const SHEET_HEIGHT_RATIO = 0.72;

function statusColor(status: PortConnectionStatus): string {
  switch (status) {
    case 'connected':
      return portPickerTheme.connected;
    case 'warning':
      return portPickerTheme.warning;
    default:
      return portPickerTheme.disconnected;
  }
}

function PortStatusDot({ color }: { color: string }) {
  return <View style={[styles.statusDot, { backgroundColor: color }]} />;
}

function PortGridButton({
  port,
  selected,
  size,
  onPress,
}: {
  port: PortDefinition;
  selected: boolean;
  size: number;
  onPress: () => void;
}) {
  const isMotor = port.interfaceKind === 'motor';
  const borderColor = selected
    ? portPickerTheme.accent
    : isMotor
    ? portPickerTheme.textMuted
    : statusColor(port.connectionStatus);

  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.portButton,
        size > 0 && { width: size, height: size },
        selected && styles.portButtonSelected,
        !selected && {
          borderWidth: 1.5,
          borderColor,
          backgroundColor: isMotor
            ? 'rgba(30, 41, 59, 0.45)'
            : port.connectionStatus === 'disconnected'
            ? 'rgba(30, 41, 59, 0.6)'
            : 'rgba(15, 23, 42, 0.9)',
        },
      ]}
    >
      {!isMotor ? <PortStatusDot color={borderColor} /> : null}
      <Text
        style={[
          styles.portLabel,
          selected && styles.portLabelSelected,
          !selected &&
            (isMotor || port.connectionStatus === 'disconnected') &&
            styles.portLabelDim,
        ]}
      >
        {port.label}
      </Text>
    </Pressable>
  );
}

function PortSection({
  title,
  ports,
  portCellSize,
  isSelected,
  onToggle,
  onGridLayout,
}: {
  title: string;
  ports: PortDefinition[];
  portCellSize: number;
  isSelected: (value: string) => boolean;
  onToggle: (value: string) => void;
  onGridLayout?: (width: number) => void;
}) {
  return (
    <View style={styles.portSection}>
      <Text style={styles.portSectionTitle}>{title}</Text>
      <View
        style={styles.grid}
        onLayout={
          onGridLayout
            ? event => {
                const width = event.nativeEvent.layout.width;
                if (width > 0) {
                  onGridLayout(width);
                }
              }
            : undefined
        }
      >
        {ports.map(port => (
          <PortGridButton
            key={port.value}
            port={port}
            selected={isSelected(port.value)}
            size={portCellSize}
            onPress={() => onToggle(port.value)}
          />
        ))}
      </View>
    </View>
  );
}

function PortLegend() {
  const legend = getPortStatusLegend();
  return (
    <View style={styles.legend}>
      {legend.map(item => (
        <View key={item.key} style={styles.legendItem}>
          <View
            style={[
              styles.legendSwatch,
              item.key === 'selected' && styles.legendSwatchSelected,
              { borderColor: item.color },
              item.key === 'selected' && { backgroundColor: item.color },
            ]}
          />
          <Text style={styles.legendText}>{item.label}</Text>
        </View>
      ))}
    </View>
  );
}

function PortDetailPanel({
  ports,
  fallbackPort,
  selectionHint,
  labels,
}: {
  ports: PortDefinition[];
  fallbackPort: PortDefinition;
  selectionHint: string;
  labels: {
    selectedPorts: string;
    interfaceType: string;
    deviceName: string;
    deviceType: string;
    status: string;
    motorInterface: string;
    sensorInterface: string;
    portLabel: (label: string) => string;
    listSeparator: string;
  };
}) {
  const primary = ports[0] ?? fallbackPort;

  return (
    <View style={styles.detailPanel}>
      <View style={styles.detailHeader}>
        <Text style={styles.detailHeaderLabel}>{selectionHint}</Text>
        <Text style={styles.detailHeaderPort}>
          {ports.length > 1
            ? ports.map(p => p.label).join(labels.listSeparator)
            : labels.portLabel(primary.label)}
        </Text>
      </View>

      {ports.length > 1 && (
        <View style={styles.detailRow}>
          <Text style={styles.detailKey}>{labels.selectedPorts}</Text>
          <Text style={styles.detailValue}>
            {ports.map(p => p.label).join(labels.listSeparator)}
          </Text>
        </View>
      )}

      <View style={styles.detailRow}>
        <Text style={styles.detailKey}>{labels.interfaceType}</Text>
        <Text style={styles.detailValue}>
          {primary.interfaceKind === 'motor'
            ? labels.motorInterface
            : labels.sensorInterface}
        </Text>
      </View>
      <View style={styles.detailRow}>
        <Text style={styles.detailKey}>{labels.deviceName}</Text>
        <Text style={styles.detailValue}>{primary.deviceName}</Text>
      </View>
      <View style={styles.detailRow}>
        <Text style={styles.detailKey}>{labels.deviceType}</Text>
        <Text style={styles.detailValue}>{primary.deviceType}</Text>
      </View>

      <View style={styles.detailRow}>
        <Text style={styles.detailKey}>{labels.status}</Text>
        <View style={styles.statusBadge}>
          {primary.interfaceKind === 'sensor' ? (
            <View
              style={[
                styles.statusBadgeDot,
                { backgroundColor: statusColor(primary.connectionStatus) },
              ]}
            />
          ) : null}
          <Text style={styles.statusBadgeText}>{primary.runtimeLabel}</Text>
        </View>
      </View>
    </View>
  );
}

export function PortPickerOverlay({
  session,
  onValueChange,
  onClose,
}: Props) {
  const { t, i18n } = useTranslation('overlays');
  const { height: screenHeight } = useWindowDimensions();
  const sheetHeight = screenHeight * SHEET_HEIGHT_RATIO;
  const { sensorPorts } = useDeviceWatch();

  const portDefinitions = useMemo(
    () => buildPortDefinitions(sensorPorts),
    [sensorPorts, i18n.language],
  );

  const maxSelections = session?.maxSelections ?? 1;
  const isMulti = maxSelections > 1;
  const selectionMode = portModeFromMaxSelections(maxSelections);

  const slideAnim = useRef(new Animated.Value(sheetHeight)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const insets = useSafeAreaInsets();

  const [gridWidth, setGridWidth] = useState(0);
  const [pendingPorts, setPendingPorts] = useState<string[]>(['0']);

  const portCellSize = useMemo(() => {
    if (gridWidth <= 0) {
      return 0;
    }
    const fitted = Math.floor(
      (gridWidth - PORT_GAP * (PORT_COLUMNS - 1)) / PORT_COLUMNS,
    );
    return Math.min(PORT_CELL_MAX_SIZE, Math.floor(fitted * PORT_CELL_SCALE));
  }, [gridWidth]);

  const detailPorts = useMemo(
    () => pendingPorts.map(v => getPortDefinition(v, portDefinitions)),
    [pendingPorts, portDefinitions],
  );

  const selectionHint = isMulti
    ? t('portPicker.selectedCount', {
        count: pendingPorts.length,
        max: maxSelections,
      })
    : t('portPicker.currentSelection');

  const detailLabels = {
    selectedPorts: t('portPicker.selectedPorts'),
    interfaceType: t('portPicker.interfaceType'),
    deviceName: t('portPicker.deviceName'),
    deviceType: t('portPicker.deviceTypeLabel'),
    status: t('portPicker.status'),
    motorInterface: t('portPicker.motorInterface'),
    sensorInterface: t('portPicker.sensorInterface'),
    portLabel: (label: string) => t('portPicker.portLabel', { label }),
    listSeparator: t('portPicker.listSeparator'),
  };

  const togglePort = useCallback(
    (portValue: string) => {
      if (!isMulti) {
        setPendingPorts([portValue]);
        return;
      }
      setPendingPorts(current => {
        const idx = current.indexOf(portValue);
        if (idx >= 0) {
          const next = current.filter(v => v !== portValue);
          return next.length > 0 ? next : current;
        }
        if (current.length < maxSelections) {
          return [...current, portValue];
        }
        return [...current.slice(1), portValue];
      });
    },
    [isMulti, maxSelections],
  );

  useEffect(() => {
    if (!session) {
      slideAnim.setValue(sheetHeight);
      fadeAnim.setValue(0);
      return;
    }

    const max = session.maxSelections ?? 1;
    const ports = normalizePortValues(parsePortFieldValue(session.value), max);
    setPendingPorts(ports);

    slideAnim.setValue(sheetHeight);
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 280,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 220,
        useNativeDriver: true,
      }),
    ]).start();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- sessionId only
  }, [session?.sessionId, fadeAnim, slideAnim, sheetHeight]);

  if (!session) {
    return null;
  }

  const canConfirm = isMulti
    ? pendingPorts.length === maxSelections
    : pendingPorts.length > 0;

  const handleConfirm = () => {
    if (!canConfirm) {
      return;
    }
    const value = coercePortFieldValue(pendingPorts.join(','), {
      mode: selectionMode,
      maxSelections,
    });
    onValueChange(session.sessionId, value);
    onClose(session.sessionId);
  };

  const isSelected = (portValue: string) => pendingPorts.includes(portValue);

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
                height: sheetHeight,
                paddingHorizontal: insets.left + spacing.xs,
              },
            ]}
            onPress={e => e.stopPropagation()}
          >
            <View style={styles.body}>
              <View style={styles.leftColumn}>
                <PortSection
                  title={t('portPicker.sensorSection')}
                  ports={portDefinitions.slice(0, 4)}
                  portCellSize={portCellSize}
                  isSelected={isSelected}
                  onToggle={togglePort}
                  onGridLayout={width => {
                    if (width > 0 && width !== gridWidth) {
                      setGridWidth(width);
                    }
                  }}
                />
                <PortSection
                  title={t('portPicker.motorSection')}
                  ports={portDefinitions.slice(4)}
                  portCellSize={portCellSize}
                  isSelected={isSelected}
                  onToggle={togglePort}
                />
                <PortLegend />

                <Pressable
                  style={[
                    styles.confirmButton,
                    !canConfirm && styles.confirmButtonDisabled,
                  ]}
                  onPress={handleConfirm}
                  disabled={!canConfirm}
                >
                  <Text style={styles.confirmIcon}>✓</Text>
                  <Text style={styles.confirmText}>
                    {t('portPicker.confirmSelect')}
                  </Text>
                </Pressable>

                <Pressable
                  style={styles.cancelButton}
                  onPress={() => onClose(session.sessionId)}
                >
                  <Text style={styles.cancelText}>{t('common.cancel')}</Text>
                </Pressable>
              </View>

              <View style={styles.rightColumn}>
                <PortDetailPanel
                  ports={detailPorts}
                  fallbackPort={portDefinitions[0]!}
                  selectionHint={selectionHint}
                  labels={detailLabels}
                />
              </View>
            </View>
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
    backgroundColor: 'rgba(2, 6, 23, 0.55)',
  },
  sheetWrap: {
    width: '100%',
  },
  sheet: {
    width: '100%',
    backgroundColor: portPickerTheme.sheetBg,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: portPickerTheme.sheetBorder,
    gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
  body: {
    flex: 1,
    flexDirection: 'row',
    minHeight: 0,
    gap: spacing.sm,
  },
  leftColumn: {
    flex: 0.92,
    minWidth: 0,
    justifyContent: 'flex-start',
    gap: spacing.xs,
  },
  portSection: {
    gap: 4,
  },
  portSectionTitle: {
    color: portPickerTheme.textMuted,
    fontSize: 10,
    fontWeight: fontWeight.bold,
    letterSpacing: 0.3,
  },
  rightColumn: {
    flex: 1,
    minWidth: 0,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: PORT_GAP,
    alignContent: 'center',
    justifyContent: 'space-between',
  },
  portButton: {
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  portButtonSelected: {
    backgroundColor: portPickerTheme.accent,
    borderWidth: 0,
    shadowColor: portPickerTheme.accent,
    shadowOpacity: 0.55,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 0 },
    elevation: 6,
  },
  statusDot: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  portLabel: {
    color: portPickerTheme.textPrimary,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.extraBold,
  },
  portLabelSelected: {
    color: '#052e16',
  },
  portLabelDim: {
    color: portPickerTheme.textDim,
  },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    paddingTop: 2,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendSwatch: {
    width: 8,
    height: 8,
    borderRadius: 4,
    borderWidth: 1,
    backgroundColor: 'transparent',
  },
  legendSwatchSelected: {
    borderWidth: 0,
  },
  legendText: {
    color: portPickerTheme.textMuted,
    fontSize: 10,
  },
  detailPanel: {
    flex: 1,
    backgroundColor: portPickerTheme.panelBg,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: portPickerTheme.panelBorder,
    padding: spacing.sm,
    gap: 6,
  },
  detailHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailHeaderLabel: {
    color: portPickerTheme.textMuted,
    fontSize: fontSize.sm,
  },
  detailHeaderPort: {
    color: portPickerTheme.accent,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.extraBold,
  },
  detailRow: {
    gap: 2,
  },
  detailKey: {
    color: portPickerTheme.textMuted,
    fontSize: 10,
  },
  detailValue: {
    color: portPickerTheme.textPrimary,
    fontSize: 12,
    fontWeight: fontWeight.bold,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(52, 211, 153, 0.35)',
  },
  statusBadgeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusBadgeText: {
    color: portPickerTheme.accent,
    fontSize: 11,
    fontWeight: fontWeight.bold,
  },
  confirmButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    alignSelf: 'stretch',
    backgroundColor: portPickerTheme.confirmBg,
    borderRadius: 10,
    paddingVertical: 10,
    shadowColor: portPickerTheme.confirmBg,
    shadowOpacity: 0.4,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  confirmButtonDisabled: {
    opacity: 0.45,
  },
  confirmIcon: {
    color: '#ecfdf5',
    fontSize: 15,
    fontWeight: fontWeight.bold,
  },
  confirmText: {
    color: '#ecfdf5',
    fontSize: fontSize.sm,
    fontWeight: fontWeight.extraBold,
  },
  cancelButton: {
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'stretch',
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: portPickerTheme.cancelBorder,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
  },
  cancelText: {
    color: portPickerTheme.textMuted,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
  },
});
