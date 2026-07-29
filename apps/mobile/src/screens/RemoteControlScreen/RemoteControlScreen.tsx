import React from 'react';
import { View } from 'react-native';
import {
  JoystickKnob,
  RemoteActionButtons,
  RemoteDirectionIndicators,
  RemoteShoulderButtons,
  useRemoteControlController,
} from '../../features/remoteControl';
import { styles } from '../../features/remoteControl/remoteControl.styles';

export function RemoteControlScreen() {
  const {
    controlState,
    setDirection,
    pressButton,
    releaseButton,
    pressShoulder,
    releaseShoulder,
  } = useRemoteControlController();

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
