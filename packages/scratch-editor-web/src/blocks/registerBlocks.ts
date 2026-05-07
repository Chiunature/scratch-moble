/**
 * 积木定义注册。
 * 在这里用 JSON 描述每个积木的外形、输入槽和样式，
 * 然后由 ScratchBlocks 渲染到画布上。
 * 新增积木时在 defineBlocksWithJsonArray 数组里追加一项即可。
 */
import * as ScratchBlocks from 'scratch-blocks';

import { BLOCK_TYPES } from './blockTypes';

export function registerEditorBlocks(): void {
  ScratchBlocks.defineBlocksWithJsonArray([
    {
      type: BLOCK_TYPES.whenFlagClicked,
      message0: '当开始运行',
      nextStatement: null,
      style: 'event_blocks',
      extensions: ['shape_hat'],
    },
    {
      type: BLOCK_TYPES.moveSteps,
      message0: '前进 %1 步',
      args0: [{ type: 'input_value', name: 'STEPS', check: 'Number' }],
      previousStatement: null,
      nextStatement: null,
      style: 'motion_blocks',
    },
    {
      type: BLOCK_TYPES.turnRight,
      message0: '右转 %1 度',
      args0: [{ type: 'input_value', name: 'DEGREES', check: 'Number' }],
      previousStatement: null,
      nextStatement: null,
      style: 'motion_blocks',
    },
    {
      type: BLOCK_TYPES.sayForSecs,
      message0: '说 %1 持续 %2 秒',
      args0: [
        { type: 'input_value', name: 'MESSAGE' },
        { type: 'input_value', name: 'SECS', check: 'Number' },
      ],
      previousStatement: null,
      nextStatement: null,
      style: 'looks_blocks',
    },
    {
      type: BLOCK_TYPES.switchCostumeTo,
      message0: '切换造型为 %1',
      args0: [{ type: 'input_value', name: 'COSTUME' }],
      previousStatement: null,
      nextStatement: null,
      style: 'looks_blocks',
    },
    {
      type: BLOCK_TYPES.repeat,
      message0: '重复执行 %1 次 %2',
      args0: [
        { type: 'input_value', name: 'TIMES', check: 'Number' },
        { type: 'input_statement', name: 'SUBSTACK' },
      ],
      previousStatement: null,
      nextStatement: null,
      style: 'loop_blocks',
    },
  ]);
}
