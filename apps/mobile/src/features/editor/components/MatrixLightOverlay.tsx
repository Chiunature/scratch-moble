/**
 * 7×5 矩阵灯编辑底部弹窗（RN 原生 UI）。
 * 交互与 Web 原型一致：点击切换，按住滑动连续绘制。
 *
 * 触摸：矩阵容器统一接管（格子 pointerEvents=none），全程 locationX/Y + 跳变过滤
 */
import React, {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Animated,
  Easing,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  MATRIX_LIGHT_COL_COUNT,
  MATRIX_LIGHT_ROW_COUNT,
  matrixLightRowsFromGrid,
  parseMatrixLightGrid,
  serializeMatrixLightRows,
  type RnMatrixLightOpenMessage,
} from '@scratch-mobile/shared';

import { fontSize, fontWeight, spacing } from '../../../theme';

type Props = {
  session: RnMatrixLightOpenMessage | null;
  /** 确认保存：单次桥消息写值并关会话，避免 value/close 竞态 */
  onCommit: (sessionId: string, rows: string) => void;
  onClose: (sessionId: string) => void;
};

type ActiveProps = {
  session: RnMatrixLightOpenMessage;
  onCommit: (sessionId: string, rows: string) => void;
  onClose: (sessionId: string) => void;
};

type CellPos = { row: number; col: number };

const ON_COLOR = '#c084fc';
const OFF_COLOR = '#1a1f3a';
const SHEET_BG = '#0f1535';
const PANEL_BG = 'rgba(15, 23, 42, 0.72)';

const CELL_GAP = 5;
const MATRIX_PADDING = 8;
const PANEL_WIDTH = 136;
const PANEL_WIDTH_COMPACT = 120;
const COMPACT_BREAKPOINT = 640;

function createGrid(on = false): boolean[][] {
  return Array.from({ length: MATRIX_LIGHT_ROW_COUNT }, () =>
    Array.from({ length: MATRIX_LIGHT_COL_COUNT }, () => on),
  );
}

function gridFromRows(rows: string): boolean[][] {
  return parseMatrixLightGrid(rows).map(row => row.map(cell => cell.on));
}

function getCellSize(screenWidth: number): number {
  return screenWidth <= COMPACT_BREAKPOINT ? 32 : 38;
}

/** 触摸坐标 → 格子索引（与 Web 端 stride 算法一致，使用渲染时的固定 cellSize） */
function locationToCell(
  localX: number,
  localY: number,
  cellSize: number,
  width: number,
  height: number,
): CellPos | null {
  const HIT_EPSILON = 4;

  if (
    localX < -HIT_EPSILON ||
    localY < -HIT_EPSILON ||
    localX > width + HIT_EPSILON ||
    localY > height + HIT_EPSILON
  ) {
    return null;
  }

  const stride = cellSize + CELL_GAP;
  const x = localX - MATRIX_PADDING;
  const y = localY - MATRIX_PADDING;

  const col = Math.min(
    MATRIX_LIGHT_COL_COUNT - 1,
    Math.max(0, Math.floor(x / stride)),
  );
  const row = Math.min(
    MATRIX_LIGHT_ROW_COUNT - 1,
    Math.max(0, Math.floor(y / stride)),
  );

  return { row, col };
}

/** Bresenham 直线补格，与 HTML 原型一致 */
function cellsBetween(from: CellPos | null, to: CellPos): CellPos[] {
  if (!from) {
    return [to];
  }
  if (from.row === to.row && from.col === to.col) {
    return [to];
  }

  const cells: CellPos[] = [];
  let row = from.row;
  let col = from.col;
  const dRow = Math.abs(to.row - from.row);
  const dCol = Math.abs(to.col - from.col);
  const sRow = from.row < to.row ? 1 : -1;
  const sCol = from.col < to.col ? 1 : -1;
  let err = dCol - dRow;

  while (row !== to.row || col !== to.col) {
    const e2 = err * 2;
    if (e2 > -dRow) {
      err -= dRow;
      col += sCol;
    }
    if (e2 < dCol) {
      err += dCol;
      row += sRow;
    }
    cells.push({ row, col });
  }

  const unique: CellPos[] = [];
  for (const cell of cells) {
    const last = unique[unique.length - 1];
    if (!last || last.row !== cell.row || last.col !== cell.col) {
      unique.push(cell);
    }
  }

  return unique;
}

/**
 * 沿直线插值采样（快速滑动时 move 事件稀疏，补全中间像素点避免断触）
 * @param stepPx 采样步长，建议约为 stride 的一半
 */
function sampleLocalLine(
  fromX: number,
  fromY: number,
  toX: number,
  toY: number,
  stepPx: number,
): { x: number; y: number }[] {
  const dx = toX - fromX;
  const dy = toY - fromY;
  const dist = Math.hypot(dx, dy);
  if (dist <= stepPx) {
    return [{ x: toX, y: toY }];
  }
  const steps = Math.min(Math.ceil(dist / stepPx), 24);
  const points: { x: number; y: number }[] = [];
  for (let i = 1; i <= steps; i += 1) {
    const t = i / steps;
    points.push({ x: fromX + dx * t, y: fromY + dy * t });
  }
  return points;
}

/** 格子索引突变但手指几乎没动 → 视为坐标毛刺，丢弃 */
function isTouchGlitch(
  prev: CellPos,
  cell: CellPos,
  pixelDist: number,
  stride: number,
): boolean {
  const dRow = Math.abs(cell.row - prev.row);
  const dCol = Math.abs(cell.col - prev.col);
  const chebyshev = Math.max(dRow, dCol);
  if (chebyshev < 2) {
    return false;
  }
  return pixelDist < stride * 0.85;
}

/** 轻量格子（无 per-cell Animated），避免打开浮层时 35 路动画拖垮 JS 线程 */
const MatrixCell = memo(function MatrixCell({
  on,
  size,
  isActive,
}: {
  on: boolean;
  size: number;
  isActive: boolean;
}) {
  return (
    <View
      pointerEvents="none"
      style={[
        styles.cell,
        {
          width: size,
          height: size,
          borderRadius: size <= 32 ? 6 : 8,
          backgroundColor: on ? ON_COLOR : OFF_COLOR,
          borderColor: on
            ? 'rgba(255, 255, 255, 0.32)'
            : 'rgba(148, 163, 184, 0.08)',
        },
        on && styles.cellOnShadow,
        isActive && styles.cellActive,
      ]}
    >
      {isActive ? <View style={styles.cellRipple} /> : null}
    </View>
  );
});

function AnimatedCounter({ value, dim }: { value: number; dim?: boolean }) {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 1.18,
        duration: 90,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 6,
        useNativeDriver: true,
      }),
    ]).start();
  }, [scaleAnim, value]);

  return (
    <Animated.Text
      style={[
        dim ? styles.counterValueDim : styles.counterValue,
        { transform: [{ scale: scaleAnim }] },
      ]}
    >
      {value}
    </Animated.Text>
  );
}

function ActionButton({
  label,
  icon,
  onPress,
  variant = 'default',
}: {
  label: string;
  icon: string;
  onPress: () => void;
  variant?: 'default' | 'allOn';
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.secondaryBtn,
        variant === 'allOn' && styles.secondaryBtnAllOn,
        pressed && styles.secondaryBtnPressed,
      ]}
    >
      <Text
        style={
          variant === 'allOn'
            ? styles.secondaryBtnAllOnText
            : styles.secondaryBtnText
        }
      >
        {icon} {label}
      </Text>
    </Pressable>
  );
}

function Toast({
  message,
  visible,
  onHidden,
}: {
  message: string;
  visible: boolean;
  onHidden: () => void;
}) {
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.9)).current;

  useEffect(() => {
    if (!visible) {
      opacity.setValue(0);
      scale.setValue(0.9);
      return;
    }
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.spring(scale, {
        toValue: 1,
        friction: 7,
        tension: 120,
        useNativeDriver: true,
      }),
    ]).start();

    const timer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(scale, {
          toValue: 0.92,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start(({ finished }) => {
        if (finished) {
          onHidden();
        }
      });
    }, 1400);

    return () => clearTimeout(timer);
  }, [message, onHidden, opacity, scale, visible]);

  if (!visible) {
    return null;
  }

  return (
    <Animated.View
      style={[styles.toast, { opacity, transform: [{ scale }] }]}
      pointerEvents="none"
    >
      <Text style={styles.toastText}>{message}</Text>
    </Animated.View>
  );
}

/** 无 Hooks，避免 HMR 时因增删 ref 导致 Hooks 顺序错乱 */
export function MatrixLightOverlay({ session, onCommit, onClose }: Props) {
  if (!session) {
    return null;
  }
  return (
    <MatrixLightOverlayContent
      session={session}
      onCommit={onCommit}
      onClose={onClose}
    />
  );
}

function MatrixLightOverlayContent({
  session,
  onCommit,
  onClose,
}: ActiveProps) {
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const isCompact = screenWidth <= COMPACT_BREAKPOINT;
  const cellSize = getCellSize(screenWidth);
  const panelWidth = isCompact ? PANEL_WIDTH_COMPACT : PANEL_WIDTH;

  const slideAnim = useRef(new Animated.Value(screenHeight)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const paintOnRef = useRef<boolean | null>(null);
  const lastCellRef = useRef<CellPos | null>(null);
  const lastLocalRef = useRef({ x: 0, y: 0 });

  const [activeCell, setActiveCell] = useState<CellPos | null>(null);
  const [pending, setPending] = useState<boolean[][]>(() => createGrid());
  const [toast, setToast] = useState<{ msg: string; key: number } | null>(null);

  const matrixSize = useMemo(() => {
    const innerW =
      MATRIX_LIGHT_COL_COUNT * cellSize +
      (MATRIX_LIGHT_COL_COUNT - 1) * CELL_GAP;
    const innerH =
      MATRIX_LIGHT_ROW_COUNT * cellSize +
      (MATRIX_LIGHT_ROW_COUNT - 1) * CELL_GAP;
    return {
      width: innerW + MATRIX_PADDING * 2,
      height: innerH + MATRIX_PADDING * 2,
    };
  }, [cellSize]);

  const onCount = useMemo(
    () => pending.reduce((sum, row) => sum + row.filter(Boolean).length, 0),
    [pending],
  );
  const offCount = MATRIX_LIGHT_ROW_COUNT * MATRIX_LIGHT_COL_COUNT - onCount;

  const showToast = useCallback((msg: string) => {
    setToast({ msg, key: Date.now() });
  }, []);

  const resetBrush = useCallback(() => {
    paintOnRef.current = null;
    lastCellRef.current = null;
    lastLocalRef.current = { x: 0, y: 0 };
    setActiveCell(null);
  }, []);

  const paintCells = useCallback(
    (cells: readonly CellPos[], paintOn: boolean) => {
      setPending(current => {
        let next: boolean[][] | null = null;

        for (const { row, col } of cells) {
          if (current[row]?.[col] === paintOn) {
            continue;
          }
          if (!next) {
            next = current.map(r => [...r]);
          }
          next[row][col] = paintOn;
        }

        return next ?? current;
      });
    },
    [],
  );

  const beginDraw = useCallback(
    (localX: number, localY: number) => {
      const cell = locationToCell(
        localX,
        localY,
        cellSize,
        matrixSize.width,
        matrixSize.height,
      );
      if (!cell) {
        resetBrush();
        return;
      }

      lastCellRef.current = cell;
      lastLocalRef.current = { x: localX, y: localY };
      setActiveCell(cell);
      setPending(current => {
        const next = current.map(r => [...r]);
        const nextValue = !next[cell.row][cell.col];
        next[cell.row][cell.col] = nextValue;
        paintOnRef.current = nextValue;

        return next;
      });
    },
    [resetBrush, cellSize, matrixSize],
  );

  const continueDraw = useCallback(
    (localX: number, localY: number) => {
      const paintOn = paintOnRef.current;
      if (paintOn === null) {
        return;
      }

      const stride = cellSize + CELL_GAP;
      const fromX = lastLocalRef.current.x;
      const fromY = lastLocalRef.current.y;
      const pixelDist = Math.hypot(localX - fromX, localY - fromY);

      const endCell = locationToCell(
        localX,
        localY,
        cellSize,
        matrixSize.width,
        matrixSize.height,
      );
      if (!endCell) {
        return;
      }

      const prev = lastCellRef.current;
      if (prev?.row === endCell.row && prev.col === endCell.col) {
        lastLocalRef.current = { x: localX, y: localY };
        return;
      }

      if (prev && isTouchGlitch(prev, endCell, pixelDist, stride)) {
        return;
      }

      const applyAt = (x: number, y: number) => {
        const cell = locationToCell(
          x,
          y,
          cellSize,
          matrixSize.width,
          matrixSize.height,
        );
        if (!cell) {
          return;
        }

        const last = lastCellRef.current;
        if (last?.row === cell.row && last.col === cell.col) {
          return;
        }

        const cells = cellsBetween(last, cell);
        lastCellRef.current = cell;
        setActiveCell(cell);
        paintCells(cells, paintOn);
      };

      const sampleStep = stride * 0.45;
      if (pixelDist > sampleStep) {
        for (const pt of sampleLocalLine(
          fromX,
          fromY,
          localX,
          localY,
          sampleStep,
        )) {
          applyAt(pt.x, pt.y);
        }
      } else {
        applyAt(localX, localY);
      }

      lastLocalRef.current = { x: localX, y: localY };
    },
    [paintCells, cellSize, matrixSize],
  );

  /** 打开后短暂忽略背景点击，避免 field 上 pointerup 穿透到 backdrop 立刻关浮层 */
  const backdropCloseEnabledRef = useRef(false);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderTerminationRequest: () => false,
        onPanResponderGrant: e => {
          const { locationX, locationY } = e.nativeEvent;
          beginDraw(locationX, locationY);
        },
        onPanResponderMove: e => {
          const { locationX, locationY } = e.nativeEvent;
          continueDraw(locationX, locationY);
        },
        onPanResponderRelease: resetBrush,
        onPanResponderTerminate: resetBrush,
      }),
    [beginDraw, continueDraw, resetBrush],
  );

  useEffect(() => {
    backdropCloseEnabledRef.current = false;
    const backdropTimer = setTimeout(() => {
      backdropCloseEnabledRef.current = true;
    }, 450);

    setPending(gridFromRows(session.rows));
    resetBrush();
    slideAnim.setValue(screenHeight);
    fadeAnim.setValue(0);

    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 220,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 180,
        useNativeDriver: true,
      }),
    ]).start();

    return () => {
      clearTimeout(backdropTimer);
      backdropCloseEnabledRef.current = false;
    };
  }, [fadeAnim, resetBrush, screenHeight, session, slideAnim]);

  const setAll = useCallback(
    (on: boolean) => {
      setPending(createGrid(on));
      resetBrush();
      showToast(on ? '已全部点亮' : '已清空');
    },
    [resetBrush, showToast],
  );

  const handleConfirm = () => {
    const rows = serializeMatrixLightRows(matrixLightRowsFromGrid(pending));
    onCommit(session.sessionId, rows);
  };

  return (
    <Animated.View
      style={[StyleSheet.absoluteFill, styles.root, { opacity: fadeAnim }]}
      pointerEvents="box-none"
    >
      <Pressable
        style={styles.backdrop}
        onPress={() => {
          if (!backdropCloseEnabledRef.current) {
            return;
          }
          onClose(session.sessionId);
        }}
      >
        <Animated.View
          style={[styles.sheetWrap, { transform: [{ translateY: slideAnim }] }]}
        >
          <Pressable
            style={[
              styles.sheet,
              {
                paddingLeft:
                  insets.left + (isCompact ? spacing.sm : spacing.md),
                paddingRight:
                  insets.right + (isCompact ? spacing.sm : spacing.md),
                paddingBottom: insets.bottom + spacing.md,
              },
            ]}
            onPress={e => e.stopPropagation()}
          >
            <View style={styles.header}>
              <Text style={styles.title}>编辑矩阵灯 (7×5)</Text>
              <Text style={styles.hint}>
                {isCompact
                  ? '点击切换，滑动连续绘制 (小屏模式)'
                  : '点击切换，按住滑动连续绘制'}
              </Text>
            </View>

            <View style={styles.body}>
              <View style={styles.matrixWrap}>
                <View
                  collapsable={false}
                  style={[
                    styles.matrixContainer,
                    { width: matrixSize.width, height: matrixSize.height },
                  ]}
                  {...panResponder.panHandlers}
                >
                  {pending.map((row, rowIndex) => (
                    <View key={`row-${rowIndex}`} style={styles.matrixRow}>
                      {row.map((on, colIndex) => (
                        <MatrixCell
                          key={`${rowIndex}-${colIndex}`}
                          on={on}
                          size={cellSize}
                          isActive={
                            activeCell?.row === rowIndex &&
                            activeCell.col === colIndex
                          }
                        />
                      ))}
                    </View>
                  ))}
                </View>
              </View>

              <View
                style={[
                  styles.panel,
                  { width: panelWidth, minWidth: panelWidth },
                ]}
              >
                <View style={styles.counterRow}>
                  <View style={styles.counterCard}>
                    <AnimatedCounter value={onCount} />
                    <Text style={styles.counterLabel}>已点亮</Text>
                  </View>
                  <View style={styles.counterCard}>
                    <AnimatedCounter value={offCount} dim />
                    <Text style={styles.counterLabel}>未点亮</Text>
                  </View>
                </View>

                <View style={styles.actionGroup}>
                  <ActionButton
                    label="全亮"
                    icon="✓"
                    variant="allOn"
                    onPress={() => setAll(true)}
                  />
                  <ActionButton
                    label="清空"
                    icon="✕"
                    onPress={() => setAll(false)}
                  />
                </View>

                <View style={styles.footerActions}>
                  <Pressable
                    style={({ pressed }) => [
                      styles.confirmButton,
                      pressed && styles.confirmButtonPressed,
                    ]}
                    onPress={handleConfirm}
                  >
                    <Text style={styles.confirmText}>确认</Text>
                  </Pressable>
                  <Pressable
                    style={({ pressed }) => [
                      styles.cancelButton,
                      pressed && styles.cancelButtonPressed,
                    ]}
                    onPress={() => onClose(session.sessionId)}
                  >
                    <Text style={styles.cancelText}>取消</Text>
                  </Pressable>
                </View>
              </View>
            </View>
          </Pressable>
        </Animated.View>
      </Pressable>

      <Toast
        message={toast?.msg ?? ''}
        visible={toast !== null}
        key={toast?.key}
        onHidden={() => setToast(null)}
      />
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
    backgroundColor: 'rgba(2, 6, 23, 0.58)',
  },
  sheetWrap: {
    width: '100%',
  },
  sheet: {
    width: '100%',
    backgroundColor: SHEET_BG,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    paddingTop: spacing.md,
    gap: spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 20,
  },
  header: {
    alignItems: 'center',
    gap: 4,
  },
  title: {
    color: '#f8fafc',
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
  },
  hint: {
    color: 'rgba(226, 232, 240, 0.55)',
    fontSize: 12,
  },
  body: {
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'stretch',
  },
  matrixWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 0,
  },
  matrixContainer: {
    padding: MATRIX_PADDING,
    borderRadius: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.28)',
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.12)',
    gap: CELL_GAP,
  },
  matrixRow: {
    flexDirection: 'row',
    gap: CELL_GAP,
  },
  cell: {
    borderWidth: 1.5,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cellOnShadow: {
    shadowColor: ON_COLOR,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.62,
    shadowRadius: 8,
    elevation: 6,
  },
  cellActive: {
    opacity: 0.92,
    transform: [{ scale: 0.94 }],
  },
  cellRipple: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    borderRadius: 999,
  },
  panel: {
    gap: 8,
  },
  counterRow: {
    flexDirection: 'row',
    gap: 8,
  },
  counterCard: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 4,
    backgroundColor: PANEL_BG,
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.12)',
  },
  counterValue: {
    color: ON_COLOR,
    fontSize: 23,
    fontWeight: fontWeight.black,
  },
  counterValueDim: {
    color: 'rgba(226, 232, 240, 0.48)',
    fontSize: 23,
    fontWeight: fontWeight.black,
  },
  counterLabel: {
    marginTop: 2,
    color: 'rgba(226, 232, 240, 0.45)',
    fontSize: 10,
  },
  actionGroup: {
    gap: 8,
  },
  secondaryBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    paddingVertical: 11,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  secondaryBtnAllOn: {
    backgroundColor: 'rgba(192, 132, 252, 0.12)',
    borderColor: 'rgba(192, 132, 252, 0.3)',
  },
  secondaryBtnPressed: {
    opacity: 0.82,
    transform: [{ scale: 0.97 }],
  },
  secondaryBtnText: {
    color: 'rgba(248, 250, 252, 0.74)',
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
  },
  secondaryBtnAllOnText: {
    color: ON_COLOR,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
  },
  footerActions: {
    gap: 8,
    marginTop: 'auto',
  },
  confirmButton: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    paddingVertical: 13,
    backgroundColor: ON_COLOR,
    shadowColor: ON_COLOR,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },
  confirmButtonPressed: {
    opacity: 0.9,
    transform: [{ translateY: 1 }],
  },
  confirmText: {
    color: '#fff',
    fontSize: fontSize.sm,
    fontWeight: fontWeight.extraBold,
  },
  cancelButton: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    paddingVertical: 10,
    backgroundColor: 'rgba(15, 23, 42, 0.44)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  cancelButtonPressed: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  cancelText: {
    color: 'rgba(226, 232, 240, 0.56)',
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
  },
  toast: {
    position: 'absolute',
    top: '45%',
    alignSelf: 'center',
    backgroundColor: 'rgba(15, 21, 53, 0.95)',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(192, 132, 252, 0.3)',
    minWidth: 160,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 12,
  },
  toastText: {
    color: '#f8fafc',
    fontSize: 14,
    fontWeight: fontWeight.bold,
  },
});
