/**
 * 积木定义注册。
 * 在这里用 JSON 描述每个积木的外形、输入槽和样式，
 * 然后由 ScratchBlocks 渲染到画布上。
 * 新增积木时在 defineBlocksWithJsonArray 数组里追加一项即可。
 *
 * type 必须与 blockTypes.ts 中的字符串一致，且 toolbox.ts 中引用的每个 type 都要在此注册。
 */
import * as ScratchBlocks from 'scratch-blocks';

import { BLOCK_TYPES } from './blockTypes';

export function registerEditorBlocks(): void {
  ScratchBlocks.defineBlocksWithJsonArray([
    {
      type: BLOCK_TYPES.motor.runForPowerSeconds,
      message0: '电机按功率运行 %1',
      args0: [{ type: 'input_value', name: 'STEPS', check: 'Number' }],
      previousStatement: null,
      nextStatement: null,
      style: 'motion_blocks',
    },
    {
      type: BLOCK_TYPES.move.pair,
      message0: '移动 配对',
      previousStatement: null,
      nextStatement: null,
      style: 'motion_blocks',
    },
    {
      type: BLOCK_TYPES.matrixLight.show,
      message0: '矩阵灯 %1',
      args0: [{ type: 'input_value', name: 'TIMES', check: 'Number' }],
      previousStatement: null,
      nextStatement: null,
      style: 'looks_blocks',
    },
    {
      type: BLOCK_TYPES.sound.playMusic,
      message0: '播放音乐',
      previousStatement: null,
      nextStatement: null,
      style: 'looks_blocks',
    },
    {
      type: BLOCK_TYPES.event.whenFlagClicked,
      message0: '当开始运行',
      nextStatement: null,
      style: 'event_blocks',
      extensions: ['shape_hat'],
    },
    {
      type: BLOCK_TYPES.control.sleepSeconds,
      message0: '等待 %1 秒',
      args0: [{ type: 'input_value', name: 'STEPS', check: 'Number' }],
      previousStatement: null,
      nextStatement: null,
      style: 'loop_blocks',
    },
    {
      type: BLOCK_TYPES.sensor.oneCalibrate,
      message0: '传感器 单次校准',
      previousStatement: null,
      nextStatement: null,
      style: 'looks_blocks',
    },
  ]);
}
