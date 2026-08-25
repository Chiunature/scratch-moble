import { StyleSheet } from 'react-native';

/** 摇杆尺寸（与样式保持一致） */
export const JOYSTICK = {
  aroundSize: 200, // 外圈直径
  baseSize: 150, // 底座直径
  headSize: 100, // 摇杆直径
  centerSize: 70, // 中心圆直径
  dotSize: 5, // 防滑圆点直径
  dotInset: 8, // 防滑圆点内边距
  directionIconSize: 50, // 方向图标尺寸
  rightRemoteTextContainerSize: 50, // 右远程文本容器尺寸
  get maxTravel() {
    return (this.baseSize - this.headSize) / 2; //获取可移动最大半径
  },
  /** 圆点在 center 内沿边居中时的 left/top */
  get dotCenterOffset() {
    return (this.centerSize - this.dotSize) / 2;
  },
  get directionIconOffset() {
    return (this.aroundSize - this.directionIconSize) / 2;
  },
  get directionIconoutSize() {
    return -this.directionIconSize;
  },
  get rightRemoteTextContainerOffset() {
    return (this.aroundSize - this.rightRemoteTextContainerSize) / 2;
  },
  get rightRemoteTextContainerOutSize() {
    return this.rightRemoteTextContainerSize / 3;
  },
} as const;

export const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  /** 摇杆停靠：偏左下，留出方向图标外溢空间 */
  joystickDock: {
    position: 'absolute',
    left: 56,
    bottom: 56,
  },

  /** YABX 停靠：偏右下 */
  actionDock: {
    position: 'absolute',
    right: 56,
    bottom: 56,
  },

  /** 外圈凹槽：内阴影在「容器」上，模拟陷进去 */
  around: {
    width: JOYSTICK.aroundSize,
    height: JOYSTICK.aroundSize,
    borderRadius: JOYSTICK.aroundSize / 2,
    alignItems: 'center',
    justifyContent: 'center',
    experimental_backgroundImage: `linear-gradient(to top, #f5f8fa, #9da4a8)`,
  },

  /** 中间深色环：实心渐变 + 轻微外投影，不要 inset */
  base: {
    width: JOYSTICK.baseSize,
    height: JOYSTICK.baseSize,
    borderRadius: JOYSTICK.baseSize / 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ccd7de',
    boxShadow: [
      {
        offsetX: 0,
        offsetY: 0,
        blurRadius: 10,
        spreadDistance: 0,
        color: 'rgba(0, 0, 0, 0.5)',
      },
      {
        offsetX: 0,
        offsetY: 10,
        blurRadius: 10,
        spreadDistance: 0,
        color: 'rgba(0, 0, 0, 0.2)',
      },
      {
        offsetX: 0,
        offsetY: 0,
        blurRadius: 16,
        spreadDistance: 0,
        color: 'rgba(0, 0, 0, 0.85)',
        inset: true,
      },
      {
        offsetX: 0,
        offsetY: 0,
        blurRadius: 24,
        spreadDistance: 0,
        color: 'rgba(0, 0, 0, 0.75)',
        inset: true,
      },
      {
        offsetX: 0,
        offsetY: 0,
        blurRadius: 48,
        spreadDistance: 0,
        color: 'rgba(0, 0, 0, 0.2)',
        inset: true,
      },
    ],
  },
  head: {
    width: JOYSTICK.headSize,
    height: JOYSTICK.headSize,
    borderRadius: JOYSTICK.headSize / 2,
    alignItems: 'center',
    justifyContent: 'center',
    experimental_backgroundImage: `linear-gradient(to top, #adb9bf, #d4dbdd)`,
    boxShadow: [
      {
        offsetX: 0,
        offsetY: -6,
        blurRadius: 10,
        spreadDistance: 0,
        color: 'rgba(255, 255, 255, 0.5)',
      },
      // 多层外阴影
      {
        offsetX: 0,
        offsetY: 4,
        blurRadius: 14,
        spreadDistance: 0,
        color: 'rgba(0, 0, 0, 0.5)',
      },
      {
        offsetX: 0,
        offsetY: 9,
        blurRadius: 8,
        spreadDistance: -2,
        color: 'rgba(0, 0, 0, 0.2)',
      },
      {
        offsetX: 0,
        offsetY: 16,
        blurRadius: 8,
        spreadDistance: 0,
        color: 'rgba(0, 0, 0, 0.4)',
      },
      // 上下两层内阴影
      {
        offsetX: 0,
        offsetY: 3,
        blurRadius: 2,
        spreadDistance: 0,
        color: 'rgba(255, 255, 255, 0.6)',
        inset: true,
      },
      {
        offsetX: 0,
        offsetY: -3,
        blurRadius: 2,
        spreadDistance: 0,
        color: 'rgba(89, 91, 92, 0.6)',
        inset: true,
      },
    ],
  },

  /** 防滑圆点容器（随 head 一起移动；手势绑在 head 上） */
  center: {
    width: JOYSTICK.centerSize,
    height: JOYSTICK.centerSize,
    borderRadius: JOYSTICK.centerSize / 2,
    position: 'relative',
    experimental_backgroundImage: `linear-gradient(to bottom, #adb9bf, #d4dbdd)`,
    boxShadow: [
      // {
      //   offsetX: 0,
      //   offsetY: 0,
      //   blurRadius: 2,
      //   spreadDistance: 0,
      //   color: 'rgba(0, 0, 0, 0.3)',
      // },
      {
        offsetX: 0,
        offsetY: 0,
        blurRadius: 4,
        spreadDistance: 0,
        color: 'rgba(0, 0, 0, 0.3)',
        inset: true,
      },
    ],
  },

  dot: {
    width: JOYSTICK.dotSize,
    height: JOYSTICK.dotSize,
    borderRadius: JOYSTICK.dotSize / 2,
    position: 'absolute',
    backgroundColor: '#8a9399',
    boxShadow: [
      {
        offsetX: 0,
        offsetY: 1,
        blurRadius: 1,
        spreadDistance: 0,
        color: 'rgba(0, 0, 0, 0.25)',
      },
    ],
  },
  dotTop: {
    top: JOYSTICK.dotInset,
    left: JOYSTICK.dotCenterOffset,
  },
  dotBottom: {
    bottom: JOYSTICK.dotInset,
    left: JOYSTICK.dotCenterOffset,
  },
  dotLeft: {
    left: JOYSTICK.dotInset,
    top: JOYSTICK.dotCenterOffset,
  },
  dotRight: {
    right: JOYSTICK.dotInset,
    top: JOYSTICK.dotCenterOffset,
  },
  directionIcon: {
    position: 'absolute',
    width: JOYSTICK.directionIconSize,
    height: JOYSTICK.directionIconSize,
  },
  directionIconTop: {
    top: JOYSTICK.directionIconoutSize,
    left: JOYSTICK.directionIconOffset,
  },
  directionIconLeft: {
    left: JOYSTICK.directionIconoutSize,
    top: JOYSTICK.directionIconOffset,
  },
  directionIconRight: {
    right: JOYSTICK.directionIconoutSize,
    top: JOYSTICK.directionIconOffset,
  },
  directionIconBottom: {
    bottom: JOYSTICK.directionIconoutSize,
    right: JOYSTICK.directionIconOffset,
  },
  rightRemote: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    position: 'relative',
    width: JOYSTICK.aroundSize,
    height: JOYSTICK.aroundSize,
    experimental_backgroundImage: `linear-gradient(to top, #f5f8fa, #9da4a8)`,
    borderRadius: JOYSTICK.aroundSize / 2,
    boxShadow: [
      {
        offsetX: 0,
        offsetY: 0,
        blurRadius: 4,
        spreadDistance: 0,
        color: 'rgba(0,0,0,0.5)',
      },
      {
        offsetX: 0,
        offsetY: 3,
        blurRadius: 2,
        spreadDistance: 0.5,
        color: 'rgba(255,255,255,0.85)',
        inset: true,
      },
      {
        offsetX: 0,
        offsetY: -3,
        blurRadius: 2,
        spreadDistance: 0.5,
        color: 'rgba(0,0,0,0.5)',
        inset: true,
      },
    ],
  },
  rightRemoteTextContainer: {
    position: 'absolute',
    width: JOYSTICK.rightRemoteTextContainerSize,
    height: JOYSTICK.rightRemoteTextContainerSize,
    borderRadius: JOYSTICK.rightRemoteTextContainerSize / 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f1f1f1',
    boxShadow: [
      {
        offsetX: -2,
        offsetY: 3,
        blurRadius: 10,
        spreadDistance: 0,
        color: 'rgba(0,0,0,0.5)',
      },
      {
        offsetX: 0,
        offsetY: 3,
        blurRadius: 2,
        spreadDistance: 0,
        color: 'rgba(255,255,255)',
        inset: true,
      },
      {
        offsetX: 0,
        offsetY: -3,
        blurRadius: 4,
        spreadDistance: 0,
        color: 'rgba(0,0,0,0.3)',
        inset: true,
      },
    ],
  },
  /** 圆形动作键按下：保留圆角与外阴影，避免套用底部键的 pressIn 变成方块 */
  actionButtonPressed: {
    backgroundColor: '#e6e6e6',
    boxShadow: [
      {
        offsetX: -1,
        offsetY: 1,
        blurRadius: 4,
        spreadDistance: 0,
        color: 'rgba(0,0,0,0.35)',
      },
      {
        offsetX: 0,
        offsetY: 2,
        blurRadius: 2,
        spreadDistance: 0,
        color: 'rgba(255,255,255,0.75)',
        inset: true,
      },
      {
        offsetX: 0,
        offsetY: -2,
        blurRadius: 3,
        spreadDistance: 0,
        color: 'rgba(0,0,0,0.4)',
        inset: true,
      },
    ],
  },
  rightRemoteTextContainerTop: {
    top: JOYSTICK.rightRemoteTextContainerOutSize,
    left: JOYSTICK.rightRemoteTextContainerOffset,
  },
  rightRemoteTextContainerLeft: {
    left: JOYSTICK.rightRemoteTextContainerOutSize,
    top: JOYSTICK.rightRemoteTextContainerOffset,
  },
  rightRemoteTextContainerRight: {
    right: JOYSTICK.rightRemoteTextContainerOutSize,
    top: JOYSTICK.rightRemoteTextContainerOffset,
  },
  rightRemoteTextContainerBottom: {
    bottom: JOYSTICK.rightRemoteTextContainerOutSize,
    right: JOYSTICK.rightRemoteTextContainerOffset,
  },
  rightRemoteText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#7a7a98',
  },
  actionButtonHitTarget: {
    flex: 1,
    alignSelf: 'stretch',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: JOYSTICK.rightRemoteTextContainerSize / 2,
  },
  /** 肩键 L：左上 */
  shoulderDockLeft: {
    position: 'absolute',
    left: 40,
    top: 28,
  },
  /** 肩键 R：右上 */
  shoulderDockRight: {
    position: 'absolute',
    right: 40,
    top: 28,
  },
  shoulderButton: {
    width: 96,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    experimental_backgroundImage: 'linear-gradient(145deg,#f0f1f5,#d4d6dc)',
    boxShadow: [
      {
        offsetX: 3,
        offsetY: 3,
        blurRadius: 8,
        spreadDistance: 0,
        color: 'rgba(0,0,0,0.12)',
      },
      {
        offsetX: -2,
        offsetY: -2,
        blurRadius: 6,
        spreadDistance: 0,
        color: 'rgba(255,255,255,0.7)',
      },
      {
        offsetX: 1,
        offsetY: 1,
        blurRadius: 2,
        spreadDistance: 0,
        color: 'rgba(255,255,255,0.8)',
        inset: true,
      },
    ],
  },
  shoulderButtonPressed: {
    experimental_backgroundImage: 'linear-gradient(145deg,#d8dae0,#c8cad0)',
    boxShadow: [
      {
        offsetX: 1,
        offsetY: 1,
        blurRadius: 4,
        spreadDistance: 0,
        color: 'rgba(0,0,0,0.15)',
      },
      {
        offsetX: 0,
        offsetY: 2,
        blurRadius: 2,
        spreadDistance: 0,
        color: 'rgba(255,255,255,0.55)',
        inset: true,
      },
      {
        offsetX: 0,
        offsetY: -2,
        blurRadius: 3,
        spreadDistance: 0,
        color: 'rgba(0,0,0,0.2)',
        inset: true,
      },
    ],
  },
  shoulderButtonHitTarget: {
    flex: 1,
    alignSelf: 'stretch',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
  },
});
