/**
 * 所有积木的 type ID 集中在这里管理。
 * 新增积木时先在此处注册，再去 registerBlocks.ts / toolbox.ts / generators.ts 补充实现。
 */
export const BLOCK_TYPES = {
  whenFlagClicked: 'event_whenflagclicked',
  moveSteps: 'motion_movesteps',
  turnRight: 'motion_turnright',
  sayForSecs: 'looks_sayforsecs',
  switchCostumeTo: 'looks_switchcostumeto',
  repeat: 'control_repeat',
} as const;
