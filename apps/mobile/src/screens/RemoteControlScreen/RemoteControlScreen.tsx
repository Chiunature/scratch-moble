import { useCallback } from 'react';
import { View, ImageBackground } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import {
  JoystickKnob,
  RemoteActionButtons,
  RemoteDirectionIndicators,
  RemoteShoulderButtons,
  useRemoteControlController,
} from '../../features/remoteControl';
import { bleDeviceManager, bleLog } from '../../services/ble';
import { useBleStore } from '../../store/useBleStore';
import { styles } from '../../features/remoteControl/remoteControl.styles';
import bg from '../../../assets/background/remoteConatinerBG.png';

/** 进入遥控模式帧 */
const ENTER_REMOTE_FRAME = [0x5a, 0x97, 0x98, 0x00, 0xc2, 0x4b, 0xa5];
/** 退出遥控模式帧 */
const EXIT_REMOTE_FRAME = [0x5a, 0x97, 0x98, 0x00, 0xc0, 0x49, 0xa5];

/** 发送遥控键值帧；发送前二次校验链路是否真的还在（UI 状态可能滞后），失败仅告警不打断操作 */
function sendRemoteFrame(frame: number[]): void {
  if (!bleDeviceManager.isConnected()) {
    bleLog.warn('遥控指令发送被拦截：蓝牙未连接');
    return;
  }
  void bleDeviceManager.sendCommand(frame).catch(error => {
    bleLog.warn(
      '遥控指令发送失败',
      error instanceof Error ? error.message : error,
    );
  });
}

export function RemoteControlScreen() {
  const isConnected =
    useBleStore(state => state.connectionStatus) === 'connected';

  const {
    controlState,
    setDirection,
    pressButton,
    releaseButton,
    pressShoulder,
    releaseShoulder,
  } = useRemoteControlController({
    send: isConnected ? sendRemoteFrame : undefined,
  });

  /**
   * 进入本屏幕自动开启遥控模式，离开时自动退出。
   * 用 useFocusEffect 而非挂载副作用：原生栈在被其他页面覆盖时不会卸载本屏，
   * 只有聚焦/失焦才能可靠对应“进入/离开遥控”。
   * 注意：App 切后台不在此处理，遥控模式会继续保持。
   */
  useFocusEffect(
    useCallback(() => {
      sendRemoteFrame(ENTER_REMOTE_FRAME);
      return () => {
        sendRemoteFrame(EXIT_REMOTE_FRAME);
      };
    }, []),
  );

  return (
    <ImageBackground style={styles.container} source={bg}>
      <RemoteShoulderButtons
        pressedShoulders={controlState.pressedShoulders}
        onPressIn={pressShoulder}
        onPressOut={releaseShoulder}
      />
      <View style={styles.joystickDock}>
        <View style={styles.around}>
          <View style={styles.base}>
            <JoystickKnob onDirectionChange={setDirection} />
          </View>
          <RemoteDirectionIndicators direction={controlState.direction} />
        </View>
      </View>
      <View style={styles.actionDock}>
        <RemoteActionButtons
          pressedButtons={controlState.pressedButtons}
          onPressIn={pressButton}
          onPressOut={releaseButton}
        />
      </View>
    </ImageBackground>
  );
}
