import React, { useMemo, useRef, useState } from 'react';
import {
  Animated,
  PanResponder,
  Pressable,
  View,
  Image,
  Text,
  Vibration,
} from 'react-native';
import topIcon from '../../../assets/remoteControlScreen/top.png';
import leftIcon from '../../../assets/remoteControlScreen/left.png';
import rightIcon from '../../../assets/remoteControlScreen/right.png';
import downIcon from '../../../assets/remoteControlScreen/down.png';
import { JOYSTICK, styles } from './RemoteControlScreen.styles';

/*圆形边界函数，用于限制摇杆的移动范围
  传入总的移动距离，和最大半径，如果移动距离得到的斜边长小于等于最大半径，
  则返回原始坐标，否则返回比例后的坐标,确保坐标始终在我规定的圆的范围里面
*/
function clampToCircle(x: number, y: number, maxRadius: number) {
  //通过x，y得到斜边长，就是到圆心的距离
  const distance = Math.hypot(x, y);
  //如果距离小于等于最大半径，则返回原始坐标
  if (distance <= maxRadius) {
    return { x, y };
  }
  //如果距离大于最大半径，则得到比例，然后返回比例后的坐标
  const scale = maxRadius / distance;
  return { x: x * scale, y: y * scale };
}

type Direction = 'top' | 'left' | 'right' | 'bottom' | 'center';

interface ButtonConfig {
  label: string;
  scaleRef: Animated.Value;
  direction?: string;
  onPressIn?: () => void;
  onPressOut?: () => void;
  onPress?: () => void;
}

function getDirection(x: number, y: number): Direction {
  if (Math.hypot(x, y) < 0.5) return 'center';
  return Math.abs(x) > Math.abs(y)
    ? x > 0
      ? 'right'
      : 'left'
    : y > 0
    ? 'bottom'
    : 'top';
}

type JoystickKnobProps = {
  onDirectionChange?: (direction: Direction) => void;
};

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const JoystickKnob = ({ onDirectionChange }: JoystickKnobProps) => {
  //创建动画值，初始为x:0,y:0，视觉位置（Animated，spring 期间会渐变）
  const pan = useRef(new Animated.ValueXY()).current;
  //设置摇杆的按下去的初始位置，每次按下时的起点（Grant 时从 positionRef 抄一份）
  const dragStart = useRef({ x: 0, y: 0 });
  //设置摇杆的当前位置，逻辑位置（不跟动画）
  const positionRef = useRef({ x: 0, y: 0 });
  //创建手势响应器
  const panResponder = useMemo(
    () =>
      PanResponder.create({
        //决定当前组件是否抢夺成为手势事件的响应者
        onStartShouldSetPanResponder: () => true,
        //决定是否在移动过程中抢夺响应权，防止其他组件抢夺响应权
        onMoveShouldSetPanResponder: () => true,
        //当另一个组件想要抢夺当前响应者的控制权时，是否放弃
        onPanResponderTerminationRequest: () => false,
        //当手势开始时，便开始触发记录摇杆的按下去的位置
        onPanResponderGrant: () => {
          //记录摇杆的按下去的位置，每次按下时的起点（Grant 时从 positionRef 抄一份）
          dragStart.current = { ...positionRef.current };
        },
        // 触发时机：当手势开始后，手势在屏幕上持续移动时，会高频触发
        onPanResponderMove: (_, gesture) => {
          const next = clampToCircle(
            dragStart.current.x + gesture.dx,
            dragStart.current.y + gesture.dy,
            JOYSTICK.maxTravel,
          );
          //得到坐标后，更新逻辑位置
          positionRef.current = next;
          //更新视觉位置
          pan.setValue(next);
          //更新回调
          onDirectionChange?.(
            getDirection(
              next.x / JOYSTICK.maxTravel,
              next.y / JOYSTICK.maxTravel,
            ),
          );
        },
        //触发时机：当手势结束时，会触发
        onPanResponderRelease: () => {
          //更新逻辑位置
          positionRef.current = { x: 0, y: 0 };
          //更新视觉位置,spring动画是弹簧动画
          Animated.spring(pan, {
            toValue: { x: 0, y: 0 },
            useNativeDriver: true,
            friction: 6,
            tension: 120,
          }).start();
          //更新回调
          onDirectionChange?.('center');
        },
        //触发时机：当前响应者被强制放弃响应权时，比如系统来电，或者其他应用抢占焦点
        onPanResponderTerminate: () => {
          //处理方式和上述onPanResponderRelease一样
          positionRef.current = { x: 0, y: 0 };
          Animated.spring(pan, {
            toValue: { x: 0, y: 0 },
            useNativeDriver: true,
            friction: 6,
            tension: 120,
          }).start();
          onDirectionChange?.('center');
        },
      }),
    [onDirectionChange, pan],
  );

  return (
    <Animated.View
      collapsable={false}
      // 使用动画值的translate变换
      style={[
        styles.head,
        {
          transform: pan.getTranslateTransform(), //获取动画值的translate变换
        },
      ]}
      {...panResponder.panHandlers} // 绑定手势
    >
      <View style={styles.center} pointerEvents="none">
        <View style={[styles.dot, styles.dotTop]} />
        <View style={[styles.dot, styles.dotLeft]} />
        <View style={[styles.dot, styles.dotRight]} />
        <View style={[styles.dot, styles.dotBottom]} />
      </View>
    </Animated.View>
  );
};

const RemoteControlButton = () => {
  const scaleTop = useRef(new Animated.Value(1)).current;
  const scaleLeft = useRef(new Animated.Value(1)).current;
  const scaleRight = useRef(new Animated.Value(1)).current;
  const scaleBottom = useRef(new Animated.Value(1)).current;
  const handlePressIn = (scale: Animated.Value) => {
    Animated.spring(scale, {
      toValue: 0.93,
      useNativeDriver: true,
      friction: 6,
      tension: 120,
    }).start();
  };
  const handlePressOut = (scale: Animated.Value) => {
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
      friction: 6,
      tension: 120,
    }).start();
  };
  const handlePress = (buttonName: string) => {
    console.log(`Pressed: ${buttonName}`);
    // 可选：触发震动反馈
    Vibration.vibrate(15);
  };
  const buttons: ButtonConfig[] = [
    { label: 'Y', scaleRef: scaleTop, direction: 'top' },
    { label: 'B', scaleRef: scaleLeft, direction: 'left' },
    { label: 'X', scaleRef: scaleRight, direction: 'right' },
    { label: 'A', scaleRef: scaleBottom, direction: 'bottom' },
  ];
  return (
    <View style={styles.rightRemote}>
      {buttons.map((button, index) => (
        <AnimatedPressable
          key={index}
          style={[
            styles.rightRemoteTextContainer,
            button.direction === 'top'
              ? styles.rightRemoteTextContainerTop
              : button.direction === 'left'
              ? styles.rightRemoteTextContainerLeft
              : button.direction === 'right'
              ? styles.rightRemoteTextContainerRight
              : styles.rightRemoteTextContainerBottom,
            { transform: [{ scale: button.scaleRef }] },
          ]}
          onPressIn={() => handlePressIn(button.scaleRef)}
          onPressOut={() => handlePressOut(button.scaleRef)}
          onPress={() => handlePress(button.label)}
        >
          <Text style={styles.rightRemoteText}>{button.label}</Text>
        </AnimatedPressable>
      ))}
    </View>
  );
};

const RemoteBottomButtons = () => {
  const [activeButton, setActiveButton] = useState<number | null>(null);
  const scaleFast = useRef(new Animated.Value(1)).current;
  const scaleMedium = useRef(new Animated.Value(1)).current;
  const scaleSlow = useRef(new Animated.Value(1)).current;
  const handlePressIn = (scale: Animated.Value) => {
    Animated.spring(scale, {
      toValue: 0.93,
      useNativeDriver: true,
      friction: 6,
      tension: 120,
    }).start();
  };
  const handlePressOut = (scale: Animated.Value) => {
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
      friction: 6,
      tension: 120,
    }).start();
  };
  // 按钮配置数组
  const buttons: ButtonConfig[] = [
    { label: '快', scaleRef: scaleFast },
    { label: '中', scaleRef: scaleMedium },
    { label: '慢', scaleRef: scaleSlow },
  ];
  return (
    <View style={styles.remoteBottomButtonsContainer}>
      {buttons.map((button, index) => (
        <AnimatedPressable
          key={index}
          style={[
            styles.remoteBottomButton,
            {
              transform: [{ scale: button.scaleRef }],
            },
            activeButton === index && styles.pressIn,
          ]}
          onPressIn={() => {
            handlePressIn(button.scaleRef);
            setActiveButton(index);
          }}
          onPressOut={() => {
            handlePressOut(button.scaleRef);
            setActiveButton(-1);
          }}
        >
          <Text style={styles.rightRemoteText}>{button.label}</Text>
        </AnimatedPressable>
      ))}
    </View>
  );
};

export function RemoteControlScreen() {
  const [direction, setDirection] = useState<Direction>('center');
  return (
    <View style={styles.container}>
      <View style={styles.around}>
        <View style={styles.base}>
          <JoystickKnob onDirectionChange={setDirection} />
        </View>
        <Image
          source={topIcon}
          style={[styles.directionIcon, styles.directionIconTop]}
          tintColor={direction === 'top' ? '#f5f8fa' : '#ccc'}
        />
        <Image
          source={leftIcon}
          style={[styles.directionIcon, styles.directionIconLeft]}
          tintColor={direction === 'left' ? '#f5f8fa' : '#ccc'}
        />
        <Image
          source={rightIcon}
          style={[styles.directionIcon, styles.directionIconRight]}
          tintColor={direction === 'right' ? '#f5f8fa' : '#ccc'}
        />
        <Image
          source={downIcon}
          style={[styles.directionIcon, styles.directionIconBottom]}
          tintColor={direction === 'bottom' ? '#f5f8fa' : '#ccc'}
        />
      </View>
      <RemoteControlButton />
      <RemoteBottomButtons />
    </View>
  );
}
