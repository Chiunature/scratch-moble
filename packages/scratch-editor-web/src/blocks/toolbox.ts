/**
 * 工具栏（Toolbox）配置。
 * 定义左侧分类面板的结构，以及每个积木在飞出栏里的默认输入值（shadow block）。
 * 新增积木后，在对应分类的 contents 数组里追加一项即可。
 */
import { BLOCK_TYPES } from './blockTypes';

/**
 * Blockly 会把返回值写进分类项的 class，不必在 CSS 里定义对应选择器；
 * 后缀与分类 id 一致即可，便于 patchToolboxCategoryIcons 从 DOM 兜底识别。
 */
function toolboxCategoryIconClasses(categoryId: string): string {
  return `toolbox-category-icon toolbox-category-icon-${categoryId}`;
}

/**
 * 工具箱分类的基础元数据，id 与 name 与下方 toolboxJson 保持一致。
 * patchToolboxCategoryIcons 等运行时补丁可从此处读取，避免各自维护一份。
 */
export const TOOLBOX_CATEGORIES = [
  { id: 'motor', displayText: '电机' },
  { id: 'move', displayText: '移动' },
  { id: 'matrixLight', displayText: '矩阵灯' },
  { id: 'sound', displayText: '声音' },
  { id: 'event', displayText: '事件' },
  { id: 'control', displayText: '控制' },
  { id: 'sensor', displayText: '传感器' },
  { id: 'operation', displayText: '运算' },
  { id: 'variable', displayText: '变量' },
  { id: 'customBlock', displayText: '自制积木' },
] as const;

export const toolboxJson = {
  kind: 'categoryToolbox',
  contents: [
    {
      kind: 'category',
      id: 'motor',
      name: '电机',
      categorystyle: 'motor_category',
      cssconfig: {
        icon: toolboxCategoryIconClasses('motor'),
      },
      //该类别下的积木
      contents: [
        {
          kind: 'block', //积木类型
          type: BLOCK_TYPES.motor.runForPowerSeconds, //积木字段名字
          //积木参数输入框
          inputs: {
            //对应args0中的name
            STEPS: {
              //积木参数使用阴影块
              shadow: {
                type: 'math_number', //阴影块类型
                fields: {
                  NUM: 10, //阴影块参数
                },
              },
            },
          },
        },
      ],
    },
    {
      kind: 'category',
      id: 'move',
      name: '移动',
      categorystyle: 'move_category',
      cssconfig: {
        icon: toolboxCategoryIconClasses('move'),
      },
      contents: [{ kind: 'block', type: BLOCK_TYPES.move.pair }],
    },
    {
      kind: 'category',
      id: 'matrixLight',
      name: '矩阵灯',
      categorystyle: 'matrixLight_category',
      cssconfig: {
        icon: toolboxCategoryIconClasses('matrixLight'),
      },
      contents: [
        {
          kind: 'block',
          type: BLOCK_TYPES.matrixLight.show,
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
    {
      kind: 'category',
      id: 'sound',
      name: '声音',
      categorystyle: 'sound_category',
      cssconfig: {
        icon: toolboxCategoryIconClasses('sound'),
      },
      contents: [{ kind: 'block', type: BLOCK_TYPES.sound.playMusic }],
    },
    {
      kind: 'category',
      id: 'event',
      name: '事件',
      categorystyle: 'event_category',
      cssconfig: {
        icon: toolboxCategoryIconClasses('event'),
      },
      contents: [{ kind: 'block', type: BLOCK_TYPES.event.whenFlagClicked }],
    },
    {
      kind: 'category',
      id: 'control',
      name: '控制',
      categorystyle: 'control_category',
      cssconfig: {
        icon: toolboxCategoryIconClasses('control'),
      },
      contents: [
        {
          kind: 'block',
          type: BLOCK_TYPES.control.sleepSeconds,
          inputs: {
            STEPS: {
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
      id: 'sensor',
      name: '传感器',
      categorystyle: 'sensor_category',
      cssconfig: {
        icon: toolboxCategoryIconClasses('sensor'),
      },
      contents: [{ kind: 'block', type: BLOCK_TYPES.sensor.oneCalibrate }],
    },
    // {
    //   kind: 'category',
    //   id: 'operation',
    //   name: '运算',
    //   categorystyle: 'operation_category',
    //   cssconfig: {
    //     icon: toolboxCategoryIconClasses('operation'),
    //   },
    //   contents: [
    //     {
    //       kind: 'block',
    //       type: BLOCK_TYPES.repeat,
    //       inputs: {
    //         TIMES: {
    //           shadow: {
    //             type: 'math_number',
    //             fields: {
    //               NUM: 10,
    //             },
    //           },
    //         },
    //       },
    //     },
    //   ],
    // },
    // {
    //   kind: 'category',
    //   id: 'variable',
    //   name: '变量',
    //   categorystyle: 'variable_category',
    //   cssconfig: {
    //     icon: toolboxCategoryIconClasses('variable'),
    //   },
    //   contents: [
    //     {
    //       kind: 'block',
    //       type: BLOCK_TYPES.repeat,
    //       inputs: {
    //         TIMES: {
    //           shadow: {
    //             type: 'math_number',
    //             fields: {
    //               NUM: 10,
    //             },
    //           },
    //         },
    //       },
    //     },
    //   ],
    // },
    // {
    //   kind: 'category',
    //   id: 'customBlock',
    //   name: '自制积木',
    //   categorystyle: 'customBlock_category',
    //   cssconfig: {
    //     icon: toolboxCategoryIconClasses('customBlock'),
    //   },
    // },
  ],
};
