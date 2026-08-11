/**
 * 交互式手柄 SVG（由用户提供的 HTML 源码移植到 react-native-svg）。
 * 仅包含 10 个可选按键：up/down/left/right/L1/R1/y/a/b/x
 */
import React, { useCallback } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, {
  Circle,
  Defs,
  Ellipse,
  G,
  LinearGradient,
  Path,
  RadialGradient,
  Rect,
  Stop,
  Text as SvgText,
} from 'react-native-svg';

import { HANDLE_SHANK_KEY_LABELS, type HandleShankKey } from '@scratch-mobile/shared';

export { HANDLE_SHANK_KEY_LABELS };

type Props = {
  width: number;
  pressing: HandleShankKey | null;
  onPressIn: (key: HandleShankKey) => void;
  onPressOut: (key: HandleShankKey) => void;
};

const VIEW_W = 460;
const VIEW_H = 220;

const BODY_LEFT_X = 72;
const BODY_RIGHT_X = 369;

/** 肩键左右对称轴（过主体左右衔接点中点） */
const SHOULDER_MIRROR_X = (BODY_LEFT_X + BODY_RIGHT_X) / 2;
const mirrorShoulderX = (x: number) => 2 * SHOULDER_MIRROR_X - x;

/** 左肩键轮廓（手绘 path） */
const L1_SHOULDER_PATH =
  'M 33 41 A 72 72 0 0 1 73 29 L 120 29 Q 125 37 120 45 L 72 45 A 72 72 0 0 0 33 60 Z';

/** 右肩键：与 L1 镜像，尺寸一致 */
const R1_SHOULDER_PATH =
  `M ${mirrorShoulderX(33)} 41 A 72 72 0 0 0 ${mirrorShoulderX(73)} 29 ` +
  `L ${mirrorShoulderX(120)} 29 Q ${mirrorShoulderX(125)} 37 ${mirrorShoulderX(120)} 45 ` +
  `L ${mirrorShoulderX(BODY_LEFT_X)} 45 A 72 72 0 0 1 ${mirrorShoulderX(33)} 60 Z`;

const L1_LABEL = { x: 75, y: 38 } as const;
const R1_LABEL = { x: mirrorShoulderX(L1_LABEL.x), y: L1_LABEL.y } as const;

/** 十字键 / ABXY / 肩键字号与触控 */
const DPAD_AW = 23;
const DPAD_AL = 39;
const DPAD_CENTER_R = 9;
const DPAD_CENTER_INNER_R = 4;
const DPAD_ARROW_FONT = 13;
const ABXY_RADIUS = 22;
const ABXY_FONT = 17;
const ABXY_HIGHLIGHT_RX = 13;
const ABXY_HIGHLIGHT_RY = 7;
const ABXY_SHADOW_RX = 11;
const ABXY_SHADOW_RY = 5;
const SHOULDER_FONT = 14;
const SHOULDER_HIT_STROKE = 10;

/** 放大按键后相对手柄主体的位置微调 */
const LAYOUT = {
  /** 十字键中心（落在左侧握把内） */
  dpadCx: 92,
  dpadCy: 110,
  /** ABXY 菱形布局中心（落在右侧握把内） */
  abxyCx: 352,
  abxyCy: 118,
  /** 四键圆心间距（越大越疏，需 > ABXY_RADIUS 避免重叠） */
  abxyDx: 40,
  abxyDy: 38,
} as const;

const SHOULDER_BUTTONS = [
  {
    key: 'L1' as const,
    path: L1_SHOULDER_PATH,
    labelX: L1_LABEL.x,
    labelY: L1_LABEL.y,
  },
  {
    key: 'R1' as const,
    path: R1_SHOULDER_PATH,
    labelX: R1_LABEL.x,
    labelY: R1_LABEL.y,
  },
] as const;

function dpadZonePath(v: 'up' | 'down' | 'left' | 'right'): string {
  const cx = LAYOUT.dpadCx;
  const cy = LAYOUT.dpadCy;
  const aw = DPAD_AW;
  const al = DPAD_AL;
  switch (v) {
    case 'up':
      return `M ${cx - aw / 2 + 2} ${cy - al - aw / 2 + 2} L ${cx + aw / 2 - 2} ${cy - al - aw / 2 + 2} L ${cx + aw / 2 - 2} ${cy - aw / 2 - 1} L ${cx - aw / 2 + 2} ${cy - aw / 2 - 1} Z`;
    case 'down':
      return `M ${cx - aw / 2 + 2} ${cy + aw / 2 + 1} L ${cx + aw / 2 - 2} ${cy + aw / 2 + 1} L ${cx + aw / 2 - 2} ${cy + al + aw / 2 - 2} L ${cx - aw / 2 + 2} ${cy + al + aw / 2 - 2} Z`;
    case 'left':
      return `M ${cx - al - aw / 2 + 2} ${cy - aw / 2 + 2} L ${cx - aw / 2 - 1} ${cy - aw / 2 + 2} L ${cx - aw / 2 - 1} ${cy + aw / 2 - 2} L ${cx - al - aw / 2 + 2} ${cy + aw / 2 - 2} Z`;
    case 'right':
      return `M ${cx + aw / 2 + 1} ${cy - aw / 2 + 2} L ${cx + al + aw / 2 - 2} ${cy - aw / 2 + 2} L ${cx + al + aw / 2 - 2} ${cy + aw / 2 - 2} L ${cx + aw / 2 + 1} ${cy + aw / 2 - 2} Z`;
  }
}

const DPAD_ZONES = [
  { key: 'up', arrow: '▲', ox: LAYOUT.dpadCx, oy: LAYOUT.dpadCy - DPAD_AL / 2 },
  { key: 'down', arrow: '▼', ox: LAYOUT.dpadCx, oy: LAYOUT.dpadCy + DPAD_AL / 2 + 3 },
  { key: 'left', arrow: '◀', ox: LAYOUT.dpadCx - DPAD_AL / 2, oy: LAYOUT.dpadCy + 3 },
  { key: 'right', arrow: '▶', ox: LAYOUT.dpadCx + DPAD_AL / 2 + 1, oy: LAYOUT.dpadCy + 3 },
] as const;

const ABXY_BUTTONS = [
  {
    key: 'y',
    x: LAYOUT.abxyCx,
    y: LAYOUT.abxyCy - LAYOUT.abxyDy,
    fill: 'url(#red)',
    fillPress: 'url(#redPress)',
    label: 'Y',
  },
  {
    key: 'x',
    x: LAYOUT.abxyCx + LAYOUT.abxyDx,
    y: LAYOUT.abxyCy,
    fill: 'url(#blue)',
    fillPress: 'url(#bluePress)',
    label: 'X',
  },
  {
    key: 'a',
    x: LAYOUT.abxyCx,
    y: LAYOUT.abxyCy + LAYOUT.abxyDy,
    fill: 'url(#yellow)',
    fillPress: 'url(#yellowPress)',
    label: 'A',
  },
  {
    key: 'b',
    x: LAYOUT.abxyCx - LAYOUT.abxyDx,
    y: LAYOUT.abxyCy,
    fill: 'url(#green)',
    fillPress: 'url(#greenPress)',
    label: 'B',
  },
] as const;

function dpadScaleTransform(v: 'up' | 'down' | 'left' | 'right', scale: number): string {
  const cx = LAYOUT.dpadCx;
  const cy = LAYOUT.dpadCy;
  const aw = DPAD_AW;
  const al = DPAD_AL;
  let centerX = cx;
  let centerY = cy;
  if (v === 'up') {
    centerY = cy - al / 2 - aw / 4;
  } else if (v === 'down') {
    centerY = cy + al / 2 + aw / 4;
  } else if (v === 'left') {
    centerX = cx - al / 2 - aw / 4;
  } else if (v === 'right') {
    centerX = cx + al / 2 + aw / 4;
  }
  return `translate(${centerX}, ${centerY}) scale(${scale}) translate(${-centerX}, ${-centerY})`;
}

function ShoulderButton({
  buttonKey,
  path,
  labelX,
  labelY,
  active,
  onPressIn,
  onPressOut,
  showShape = true,
  showLabel = true,
  interactive = true,
}: {
  buttonKey: HandleShankKey;
  path: string;
  labelX: number;
  labelY: number;
  active: boolean;
  onPressIn?: () => void;
  onPressOut?: () => void;
  showShape?: boolean;
  showLabel?: boolean;
  interactive?: boolean;
}) {
  const shapeContent = (
    <>
      <Path d={path} fill="#000" opacity={active ? 0.15 : 0.4} transform="translate(0, 3)" />
      <Path
        d={path}
        fill={active ? 'url(#shoulderGradActive)' : 'url(#shoulderGrad)'}
        stroke={active ? '#64b5f6' : '#5a5a6a'}
        strokeWidth={1.5}
        transform={active ? 'translate(0, 2)' : undefined}
      />
      <Path d={path} fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth={1} />
    </>
  );

  if (!showShape && showLabel) {
    return (
      <SvgText
        x={labelX}
        y={labelY + (active ? 2 : 0)}
        textAnchor="middle"
        alignmentBaseline="middle"
        fontSize={SHOULDER_FONT}
        fontWeight="bold"
        fill={active ? '#fff' : '#888'}
      >
        {buttonKey}
      </SvgText>
    );
  }

  return (
    <G
      onPressIn={interactive ? onPressIn : undefined}
      onPressOut={interactive ? onPressOut : undefined}
    >
      {interactive && (
        <Path
          d={path}
          fill="transparent"
          stroke="transparent"
          strokeWidth={SHOULDER_HIT_STROKE}
        />
      )}
      {showShape && shapeContent}
      {showLabel && (
        <SvgText
          x={labelX}
          y={labelY + (active ? 2 : 0)}
          textAnchor="middle"
          alignmentBaseline="middle"
          fontSize={SHOULDER_FONT}
          fontWeight="bold"
          fill={active ? '#fff' : '#888'}
        >
          {buttonKey}
        </SvgText>
      )}
    </G>
  );
}

function DpadButton({
  zoneKey,
  arrow,
  ox,
  oy,
  active,
  onPressIn,
  onPressOut,
}: {
  zoneKey: Extract<HandleShankKey, 'up' | 'down' | 'left' | 'right'>;
  arrow: string;
  ox: number;
  oy: number;
  active: boolean;
  onPressIn: () => void;
  onPressOut: () => void;
}) {
  const path = dpadZonePath(zoneKey);
  const scaleTransform = active ? dpadScaleTransform(zoneKey, 0.88) : undefined;

  return (
    <G onPressIn={onPressIn} onPressOut={onPressOut}>
      <Path d={path} fill="#000" opacity={active ? 0.15 : 0.4} />
      <Path
        d={path}
        fill={active ? '#1a1a2a' : '#2a2a3a'}
        stroke={active ? '#1565c0' : '#3a3a4a'}
        strokeWidth={0.5}
        transform={scaleTransform}
      />
      <Path
        d={path}
        fill="none"
        stroke={active ? 'rgba(255,255,255,0.02)' : 'rgba(255,255,255,0.1)'}
        strokeWidth={1}
        transform={scaleTransform}
      />
      <SvgText
        x={ox}
        y={oy}
        textAnchor="middle"
        fontSize={DPAD_ARROW_FONT}
        fill={active ? 'rgba(100,181,246,0.9)' : 'rgba(255,255,255,0.4)'}
        transform={scaleTransform}
      >
        {arrow}
      </SvgText>
    </G>
  );
}

function AbxyButton({
  x,
  y,
  fill,
  fillPress,
  label,
  active,
  onPressIn,
  onPressOut,
}: {
  x: number;
  y: number;
  fill: string;
  fillPress: string;
  label: string;
  active: boolean;
  onPressIn: () => void;
  onPressOut: () => void;
}) {
  return (
    <G onPressIn={onPressIn} onPressOut={onPressOut}>
      <Circle cx={x} cy={y + 3} r={ABXY_RADIUS} fill="#000" opacity={active ? 0.15 : 0.5} />
      <Circle
        cx={x}
        cy={y + (active ? 3 : 0)}
        r={ABXY_RADIUS}
        fill={active ? fillPress : fill}
        stroke={active ? 'rgba(0,0,0,0.5)' : 'rgba(0,0,0,0.3)'}
        strokeWidth={1}
      />
      <Ellipse
        cx={x - 3}
        cy={y - 5 + (active ? 3 : 0)}
        rx={ABXY_HIGHLIGHT_RX}
        ry={ABXY_HIGHLIGHT_RY}
        fill={active ? 'rgba(255,255,255,0.02)' : 'rgba(255,255,255,0.12)'}
      />
      <Ellipse
        cx={x + 2}
        cy={y + 6 + (active ? 3 : 0)}
        rx={ABXY_SHADOW_RX}
        ry={ABXY_SHADOW_RY}
        fill={active ? 'rgba(255,255,255,0.01)' : 'rgba(255,255,255,0.04)'}
      />
      <SvgText
        x={x}
        y={y + 5 + (active ? 3 : 0)}
        textAnchor="middle"
        fontSize={ABXY_FONT}
        fontWeight="bold"
        fill={active ? 'rgba(255,255,255,0.7)' : '#fff'}
      >
        {label}
      </SvgText>
    </G>
  );
}

export function GameControllerSvg({ width, pressing, onPressIn, onPressOut }: Props) {
  const height = width * (VIEW_H / VIEW_W);

  const bind = useCallback(
    (key: HandleShankKey) => ({
      active: pressing === key,
      onPressIn: () => onPressIn(key),
      onPressOut: () => onPressOut(key),
    }),
    [onPressIn, onPressOut, pressing],
  );

  const dpadBasePath = `M ${LAYOUT.dpadCx - DPAD_AW / 2} ${LAYOUT.dpadCy - DPAD_AL - DPAD_AW / 2} L ${LAYOUT.dpadCx + DPAD_AW / 2} ${LAYOUT.dpadCy - DPAD_AL - DPAD_AW / 2} L ${LAYOUT.dpadCx + DPAD_AW / 2} ${LAYOUT.dpadCy - DPAD_AW / 2} L ${LAYOUT.dpadCx + DPAD_AL + DPAD_AW / 2} ${LAYOUT.dpadCy - DPAD_AW / 2} L ${LAYOUT.dpadCx + DPAD_AL + DPAD_AW / 2} ${LAYOUT.dpadCy + DPAD_AW / 2} L ${LAYOUT.dpadCx + DPAD_AW / 2} ${LAYOUT.dpadCy + DPAD_AW / 2} L ${LAYOUT.dpadCx + DPAD_AW / 2} ${LAYOUT.dpadCy + DPAD_AL + DPAD_AW / 2} L ${LAYOUT.dpadCx - DPAD_AW / 2} ${LAYOUT.dpadCy + DPAD_AL + DPAD_AW / 2} L ${LAYOUT.dpadCx - DPAD_AW / 2} ${LAYOUT.dpadCy + DPAD_AW / 2} L ${LAYOUT.dpadCx - DPAD_AL - DPAD_AW / 2} ${LAYOUT.dpadCy + DPAD_AW / 2} L ${LAYOUT.dpadCx - DPAD_AL - DPAD_AW / 2} ${LAYOUT.dpadCy - DPAD_AW / 2} L ${LAYOUT.dpadCx - DPAD_AW / 2} ${LAYOUT.dpadCy - DPAD_AW / 2} Z`;

  const dpadInsetPath = `M ${LAYOUT.dpadCx - DPAD_AW / 2 + 1} ${LAYOUT.dpadCy - DPAD_AL - DPAD_AW / 2 + 1} L ${LAYOUT.dpadCx + DPAD_AW / 2 - 1} ${LAYOUT.dpadCy - DPAD_AL - DPAD_AW / 2 + 1} L ${LAYOUT.dpadCx + DPAD_AW / 2 - 1} ${LAYOUT.dpadCy - DPAD_AW / 2} L ${LAYOUT.dpadCx + DPAD_AL + DPAD_AW / 2 - 1} ${LAYOUT.dpadCy - DPAD_AW / 2} L ${LAYOUT.dpadCx + DPAD_AL + DPAD_AW / 2 - 1} ${LAYOUT.dpadCy + DPAD_AW / 2} L ${LAYOUT.dpadCx + DPAD_AW / 2 - 1} ${LAYOUT.dpadCy + DPAD_AW / 2} L ${LAYOUT.dpadCx + DPAD_AW / 2 - 1} ${LAYOUT.dpadCy + DPAD_AL + DPAD_AW / 2 - 1} L ${LAYOUT.dpadCx - DPAD_AW / 2 + 1} ${LAYOUT.dpadCy + DPAD_AL + DPAD_AW / 2 - 1} L ${LAYOUT.dpadCx - DPAD_AW / 2 + 1} ${LAYOUT.dpadCy + DPAD_AW / 2} L ${LAYOUT.dpadCx - DPAD_AL - DPAD_AW / 2 + 1} ${LAYOUT.dpadCy + DPAD_AW / 2} L ${LAYOUT.dpadCx - DPAD_AL - DPAD_AW / 2 + 1} ${LAYOUT.dpadCy - DPAD_AW / 2} L ${LAYOUT.dpadCx - DPAD_AW / 2 + 1} ${LAYOUT.dpadCy - DPAD_AW / 2} Z`;

  return (
    <View style={[styles.wrapper, { width, height }]}>
      <Svg width={width} height={height} viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}>
        <Defs>
          <LinearGradient id="bodyGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <Stop offset="0%" stopColor="#2a2a3a" />
            <Stop offset="100%" stopColor="#1a1a2a" />
          </LinearGradient>
          <LinearGradient id="shoulderGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <Stop offset="0%" stopColor="#4a4a5a" />
            <Stop offset="100%" stopColor="#2a2a3a" />
          </LinearGradient>
          <LinearGradient id="shoulderGradActive" x1="0%" y1="0%" x2="0%" y2="100%">
            <Stop offset="0%" stopColor="#64b5f6" />
            <Stop offset="100%" stopColor="#1565c0" />
          </LinearGradient>
          <RadialGradient id="red" cx="35%" cy="35%" r="65%">
            <Stop offset="0%" stopColor="#ff6b6b" />
            <Stop offset="100%" stopColor="#c62828" />
          </RadialGradient>
          <RadialGradient id="blue" cx="35%" cy="35%" r="65%">
            <Stop offset="0%" stopColor="#42a5f5" />
            <Stop offset="100%" stopColor="#1565c0" />
          </RadialGradient>
          <RadialGradient id="green" cx="35%" cy="35%" r="65%">
            <Stop offset="0%" stopColor="#66bb6a" />
            <Stop offset="100%" stopColor="#2e7d32" />
          </RadialGradient>
          <RadialGradient id="yellow" cx="35%" cy="35%" r="65%">
            <Stop offset="0%" stopColor="#ffca28" />
            <Stop offset="100%" stopColor="#f57f17" />
          </RadialGradient>
          <RadialGradient id="redPress" cx="35%" cy="35%" r="65%">
            <Stop offset="0%" stopColor="#b71c1c" />
            <Stop offset="100%" stopColor="#7f0000" />
          </RadialGradient>
          <RadialGradient id="bluePress" cx="35%" cy="35%" r="65%">
            <Stop offset="0%" stopColor="#0d47a1" />
            <Stop offset="100%" stopColor="#002171" />
          </RadialGradient>
          <RadialGradient id="greenPress" cx="35%" cy="35%" r="65%">
            <Stop offset="0%" stopColor="#1b5e20" />
            <Stop offset="100%" stopColor="#003300" />
          </RadialGradient>
          <RadialGradient id="yellowPress" cx="35%" cy="35%" r="65%">
            <Stop offset="0%" stopColor="#f57f17" />
            <Stop offset="100%" stopColor="#e65100" />
          </RadialGradient>
        </Defs>

        {/* 肩键形状（先绘制，主体内缘覆盖形成贴合） */}
        {SHOULDER_BUTTONS.map(btn => (
          <ShoulderButton
            key={`${btn.key}-shape`}
            buttonKey={btn.key}
            path={btn.path}
            labelX={btn.labelX}
            labelY={btn.labelY}
            showLabel={false}
            {...bind(btn.key)}
          />
        ))}

        {/* 手柄主体 */}
        <Path
          d="M121 174 A72 72 0 1 1 72 45 L369 45 A72 72 0 1 1 323 174 Z"
          fill="url(#bodyGrad)"
          stroke="#4a4a5a"
          strokeWidth={2}
        />
        <Rect x={180} y={55} width={100} height={4} rx={2} fill="rgba(100,181,246,0.15)" />

        {/* 肩键文字（叠在主体之上） */}
        {SHOULDER_BUTTONS.map(btn => (
          <ShoulderButton
            key={`${btn.key}-label`}
            buttonKey={btn.key}
            path={btn.path}
            labelX={btn.labelX}
            labelY={btn.labelY}
            showShape={false}
            active={pressing === btn.key}
            interactive={false}
          />
        ))}

        {/* 十字键底座 */}
        <Path d={dpadBasePath} fill="#0f0f1a" stroke="#1a1a2a" strokeWidth={1} />
        <Path d={dpadInsetPath} fill="none" stroke="rgba(0,0,0,0.6)" strokeWidth={1.5} />

        {/* 十字键四方向 */}
        {DPAD_ZONES.map(z => (
          <DpadButton
            key={z.key}
            zoneKey={z.key}
            arrow={z.arrow}
            ox={z.ox}
            oy={z.oy}
            {...bind(z.key)}
          />
        ))}

        <Circle cx={LAYOUT.dpadCx} cy={LAYOUT.dpadCy} r={DPAD_CENTER_R} fill="#0f0f1a" stroke="#1a1a2a" strokeWidth={1} />
        <Circle cx={LAYOUT.dpadCx} cy={LAYOUT.dpadCy} r={DPAD_CENTER_INNER_R} fill="rgba(100,181,246,0.15)" />

        {/* ABXY */}
        {ABXY_BUTTONS.map(btn => (
          <AbxyButton
            key={btn.key}
            x={btn.x}
            y={btn.y}
            fill={btn.fill}
            fillPress={btn.fillPress}
            label={btn.label}
            {...bind(btn.key)}
          />
        ))}
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignSelf: 'center',
  },
});
