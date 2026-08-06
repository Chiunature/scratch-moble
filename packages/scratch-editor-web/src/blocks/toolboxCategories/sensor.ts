import { BLOCK_TYPES } from '../blockTypes';
import { buildToolboxCategory } from './buildCategory';
import { tEditor } from '@scratch-mobile/i18n';
import {
  portShadow,
  numberKeyboardShadow,
  portShadowMulti,
  handleShankShadow,
} from './shadowPresets';

export function sensorToolboxCategory() {
  return buildToolboxCategory({
    id: 'sensor',
    categorystyle: 'sensor_category',
    contents: [
      { kind: 'label', text: tEditor('toolboxLabels.sensor.touch') },
      {
        kind: 'block',
        type: BLOCK_TYPES.sensor.touch_sensor.state,
        inputs: { PORTS: { shadow: portShadow('0') } },
      },
      { kind: 'label', text: tEditor('toolboxLabels.sensor.grayscale') },
      {
        kind: 'block',
        type: BLOCK_TYPES.sensor.gray_sensor.lux,
        inputs: { PORTS: { shadow: portShadow('0') } },
      },
      {
        kind: 'block',
        type: BLOCK_TYPES.sensor.gray_sensor.cmpLux,
        inputs: {
          PORTS: { shadow: portShadow('0') },
          VALUE: { shadow: numberKeyboardShadow(50) },
        },
        fields: {
          CMP: '=',
        },
      },
      {
        kind: 'block',
        type: BLOCK_TYPES.sensor.gray_sensor.setColorThresholdValue,
        inputs: {
          PORTS: { shadow: portShadow('0') },
          VALUE: { shadow: numberKeyboardShadow(500) },
        },
      },
      {
        kind: 'block',
        type: BLOCK_TYPES.sensor.gray_sensor.luxState,
        inputs: {
          PORTS: { shadow: portShadow('0') },
        },
      },
      {
        kind: 'block',
        type: BLOCK_TYPES.sensor.gray_sensor.oneCalibrate,
        inputs: {
          PORTS: { shadow: portShadow('0') },
          SECONDS: { shadow: numberKeyboardShadow(1) },
        },
      },
      {
        kind: 'block',
        type: BLOCK_TYPES.sensor.gray_sensor.twoCalibrate,
        inputs: {
          PORTS: { shadow: portShadowMulti(['0', '1']) },
          SECONDS: { shadow: numberKeyboardShadow(1) },
        },
      },
      { kind: 'label', text: tEditor('toolboxLabels.sensor.ultrasonic') },
      {
        kind: 'block',
        type: BLOCK_TYPES.sensor.ultrasonic_sensor.cmpValue,
        inputs: {
          PORTS: { shadow: portShadow('0') },
          VALUE: { shadow: numberKeyboardShadow(100) },
        },
        fields: {
          CMP: '=',
        },
      },
      {
        kind: 'block',
        type: BLOCK_TYPES.sensor.ultrasonic_sensor.value,
        inputs: {
          PORTS: { shadow: portShadow('0') },
        },
      },
      { kind: 'label', text: tEditor('toolboxLabels.sensor.remote') },
      {
        kind: 'block',
        type: BLOCK_TYPES.sensor.remote_control_sensor.keyRemote,
        inputs: {
          HANDLESHANK: { shadow: handleShankShadow('up') },
        },
        fields: {
          STATE: 'press',
        },
      },
      {
        kind: 'block',
        type: BLOCK_TYPES.sensor.remote_control_sensor.movSetAdvanceOffset,
        inputs: {
          LEFT_OFFSET: { shadow: numberKeyboardShadow(0) },
          RIGHT_OFFSET: { shadow: numberKeyboardShadow(0) },
        },
      },
      {
        kind: 'block',
        type: BLOCK_TYPES.sensor.remote_control_sensor.movSetRetreatOffset,
        inputs: {
          LEFT_OFFSET: { shadow: numberKeyboardShadow(0) },
          RIGHT_OFFSET: { shadow: numberKeyboardShadow(0) },
        },
      },
      {
        kind: 'block',
        type: BLOCK_TYPES.sensor.remote_control_sensor.readAdcanceLeftOffset,
      },
      {
        kind: 'block',
        type: BLOCK_TYPES.sensor.remote_control_sensor.readAdvanceRightOffset,
      },
      {
        kind: 'block',
        type: BLOCK_TYPES.sensor.remote_control_sensor.readRetreatLeftOffset,
      },
      {
        kind: 'block',
        type: BLOCK_TYPES.sensor.remote_control_sensor.readRetreatRightOffset,
      },
      { kind: 'label', text: tEditor('toolboxLabels.sensor.other') },
      {
        kind: 'block',
        type: BLOCK_TYPES.sensor.other.keyMast,
        fields: {
          KEY: 'left',
          STATE: '1',
        },
      },
      {
        kind: 'block',
        type: BLOCK_TYPES.sensor.other.timer,
      },
      {
        kind: 'block',
        type: BLOCK_TYPES.sensor.other.resetTimer,
      },
    ],
  });
}
