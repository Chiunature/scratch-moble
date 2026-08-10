import React from 'react';
import { View } from 'react-native';
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

/** 发送遥控键值帧；失败仅告警，不打断操作 */
function sendRemoteFrame(frame: number[]): void {
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

  return (
    <View style={styles.container}>
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
    </View>
  );
}