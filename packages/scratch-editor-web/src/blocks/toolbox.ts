/**
 * 工具栏（Toolbox）配置。
 * 定义左侧分类面板的结构，以及每个积木在飞出栏里的默认输入值（shadow block）。
 * 新增积木后，在对应分类的 contents 数组里追加一项即可。
 */
import { BLOCK_TYPES } from './blockTypes';

export const toolboxJson = {
  kind: 'categoryToolbox',
  contents: [
    {
      kind: 'category',
      name: '事件',
      categorystyle: 'event_category',
      contents: [{ kind: 'block', type: BLOCK_TYPES.whenFlagClicked }],
    },
    {
      kind: 'category',
      name: '运动',
      categorystyle: 'motion_category',
      contents: [
        {
          kind: 'block',
          type: BLOCK_TYPES.moveSteps,
          inputs: {
            STEPS: {
              shadow: {
                type: 'math_number',
                fields: {
                  NUM: 10,
                },
              },
            },
          },
        },
        {
          kind: 'block',
          type: BLOCK_TYPES.turnRight,
          inputs: {
            DEGREES: {
              shadow: {
                type: 'math_number',
                fields: {
                  NUM: 15,
                },
              },
            },
          },
        },
      ],
    },
    {
      kind: 'category',
      name: '外观',
      categorystyle: 'looks_category',
      contents: [
        { kind: 'block', type: BLOCK_TYPES.sayForSecs },
        { kind: 'block', type: BLOCK_TYPES.switchCostumeTo },
      ],
    },
    {
      kind: 'category',
      name: '控制',
      categorystyle: 'loop_category',
      contents: [
        {
          kind: 'block',
          type: BLOCK_TYPES.repeat,
          inputs: {
            TIMES: {
              shadow: {
                type: 'math_number',
                fields: {
                  NUM: 10,
                },
              },
            },
          },
        },
      ],
    },
  ],
};
