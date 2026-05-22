/**
 * 端口选择底部弹窗（RN 原生 UI）。
 *
 * WebView 点击 port_dropdown 字段后，EditorScreen 收到 `editor.portPicker.open`，
 * 渲染本组件；用户确认后通过 `onValueChange` 回传 value，由 Web 写入 PORT 字段。
 *
 * 端口列表与详情数据见 `portPickerOptions.ts`（RN 侧唯一定义）。
 */
import { useEffect, useMemo, useRef, useState } from 'react';
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

import { fontSize, fontWeight, spacing } from '../theme';
import type { RnPortPickerOpenMessage } from './editorMessages';
import {
  PORT_DEFINITIONS,
  PORT_STATUS_LEGEND,
  getPortDefinition,
  portPickerTheme,
  type PortConnectionStatus,
  type PortDefinition,
} from './portPickerOptions';

type Props = {
  /** 当前会话；null 时不渲染（由 EditorScreen 控制） */
  session: RnPortPickerOpenMessage | null;
  /** 用户点「确认选择」：把 pending 端口写回 WebView */
  onValueChange: (sessionId: string, value: string) => void;
  /** 关闭浮层（取消 / 点遮罩 / 确认后收尾） */
  onClose: (sessionId: string) => void;
};

/** 端口网格列数（4×2 = 8 个口） */
const PORT_COLUMNS = 4;
/** 格子间距 */
const PORT_GAP = 6;
/** 单格最大边长，防止小屏左侧被格子占满 */
const PORT_CELL_MAX_SIZE = 38;
/** 在可容纳尺寸上再缩小，给右侧详情区留宽 */
const PORT_CELL_SCALE = 0.92;
/** 底部面板高度占屏幕比例 */
const SHEET_HEIGHT_RATIO = 0.72;

/** 连接状态 → 描边 / 角标颜色 */
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

/** 格子右上角状态圆点 */
function PortStatusDot({ color }: { color: string }) {
  return <View style={[styles.statusDot, { backgroundColor: color }]} />;
}

/**
 * 单个端口格子（正方形，边长由父级 onLayout 计算）。
 * 点击只更新本地 pending，不立刻回传 Web。
 */
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
  const borderColor = selected
    ? portPickerTheme.accent
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
          backgroundColor:
            port.connectionStatus === 'disconnected'
              ? 'rgba(30, 41, 59, 0.6)'
              : 'rgba(15, 23, 42, 0.9)',
        },
      ]}
    >
      <PortStatusDot color={borderColor} />
      <Text
        style={[
          styles.portLabel,
          selected && styles.portLabelSelected,
          port.connectionStatus === 'disconnected' &&
            !selected &&
            styles.portLabelDim,
        ]}
      >
        {port.label}
      </Text>
    </Pressable>
  );
}

/** 网格下方图例：已选中 / 已连接 / 警告 / 未连接 */
function PortLegend() {
  return (
    <View style={styles.legend}>
      {PORT_STATUS_LEGEND.map(item => (
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

/** 右侧详情卡片：展示 pending 端口对应的设备信息 */
function PortDetailPanel({ port }: { port: PortDefinition }) {
  const statusColorValue = statusColor(port.connectionStatus);

  return (
    <View style={styles.detailPanel}>
      <View style={styles.detailHeader}>
        <Text style={styles.detailHeaderLabel}>当前选择</Text>
        <Text style={styles.detailHeaderPort}>端口 {port.label}</Text>
      </View>

      <View style={styles.detailRow}>
        <Text style={styles.detailKey}>设备名称</Text>
        <Text style={styles.detailValue}>{port.deviceName}</Text>
      </View>
      <View style={styles.detailRow}>
        <Text style={styles.detailKey}>设备类型</Text>
        <Text style={styles.detailValue}>{port.deviceType}</Text>
      </View>

      <View style={styles.detailRow}>
        <Text style={styles.detailKey}>连接状态</Text>
        <View style={styles.statusBadge}>
          <View
            style={[
              styles.statusBadgeDot,
              { backgroundColor: statusColorValue },
            ]}
          />
          <Text style={styles.statusBadgeText}>{port.runtimeLabel}</Text>
        </View>
      </View>
    </View>
  );
}

export function PortPickerOverlay({ session, onValueChange, onClose }: Props) {
  const { height: screenHeight } = useWindowDimensions();
  const sheetHeight = screenHeight * SHEET_HEIGHT_RATIO;

  /** 面板自屏幕底部外滑入的距离 */
  const slideAnim = useRef(new Animated.Value(sheetHeight)).current;
  /** 遮罩淡入 */
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const insets = useSafeAreaInsets();

  /** 左侧网格实测宽度，用于计算正方形边长 */
  const [gridWidth, setGridWidth] = useState(0);
  /** 待确认端口（点格子只改本地，确认后才 onValueChange） */
  const [pendingValue, setPendingValue] = useState('0');

  const portCellSize = useMemo(() => {
    if (gridWidth <= 0) {
      return 0;
    }
    const fitted = Math.floor(
      (gridWidth - PORT_GAP * (PORT_COLUMNS - 1)) / PORT_COLUMNS,
    );
    return Math.min(PORT_CELL_MAX_SIZE, Math.floor(fitted * PORT_CELL_SCALE));
  }, [gridWidth]);

  const pendingPort = getPortDefinition(pendingValue);

  useEffect(() => {
    if (!session) {
      slideAnim.setValue(sheetHeight);
      fadeAnim.setValue(0);
      return;
    }

    setPendingValue(session.value);
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
  }, [session?.sessionId, fadeAnim, slideAnim, sheetHeight]);

  if (!session) {
    return null;
  }

  const handleConfirm = () => {
    onValueChange(session.sessionId, pendingValue);
    onClose(session.sessionId);
  };

  return (
    <Animated.View
      style={[StyleSheet.absoluteFill, styles.root, { opacity: fadeAnim }]}
      pointerEvents="box-none"
    >
      {/* 点遮罩 = 取消，不写回 Web */}
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
              {/* 左：网格 + 图例 + 确认/取消 */}
              <View style={styles.leftColumn}>
                <View
                  style={styles.grid}
                  onLayout={event => {
                    const w = event.nativeEvent.layout.width;
                    if (w > 0 && w !== gridWidth) {
                      setGridWidth(w);
                    }
                  }}
                >
                  {PORT_DEFINITIONS.map(port => (
                    <PortGridButton
                      key={port.value}
                      port={port}
                      selected={pendingValue === port.value}
                      size={portCellSize}
                      onPress={() => setPendingValue(port.value)}
                    />
                  ))}
                </View>
                <PortLegend />

                <Pressable style={styles.confirmButton} onPress={handleConfirm}>
                  <Text style={styles.confirmIcon}>✓</Text>
                  <Text style={styles.confirmText}>确认选择</Text>
                </Pressable>

                <Pressable
                  style={styles.cancelButton}
                  onPress={() => onClose(session.sessionId)}
                >
                  <Text style={styles.cancelText}>取消</Text>
                </Pressable>
              </View>

              {/* 右：当前 pending 端口详情 */}
              <View style={styles.rightColumn}>
                <PortDetailPanel port={pendingPort} />
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
    gap: spacing.sm,
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
