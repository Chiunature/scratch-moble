/**
 * 所有积木的 type ID 集中在这里管理。
 * 新增积木时先在此处注册，再在 blockDefinitions/<分类>.ts、toolbox.ts、generators.ts 补充实现。
 */
export const BLOCK_TYPES = {
  common: {
    /** 通用端口下拉报告块（Number），可作为任意 PORT/PORTS 输入槽的默认阴影 */
    portDropdown: 'port_dropdown',
    /** 整数滑块阴影（precision=1） */
    integerSlider: 'number_slider_integer',
    /** 小数滑块阴影（默认 precision=0.1） */
    decimalSlider: 'number_slider_decimal',
    /** 非负整数键盘阴影（历史 type 名保留兼容） */
    positiveKeyboard: 'math_positive_number_keyboard',
  },
  motor: {
    runForPowerSeconds: 'run_for_power_seconds',
    runPower: 'run_power',
    stop: 'stop',
    stopModule: 'stop_module',
  },
  move: {
    pair: 'pair',
  },
  matrixLight: {
    show: 'show',
  },
  sound: {
    playMusic: 'play_music',
  },
  event: {
    whenFlagClicked: 'event_when_flag_clicked',
  },
  control: {
    sleepSeconds: 'control_sleep_seconds',
  },
  sensor: {
    oneCalibrate: 'one_calibrate',
  },
} as const;

/** 自定义数字字面量/阴影块（字段 NUM），供 codegen 等与 scratch 内置 math_* 一并处理 */
export const CUSTOM_NUMERIC_LITERAL_TYPES = [
  BLOCK_TYPES.common.integerSlider,
  BLOCK_TYPES.common.decimalSlider,
  BLOCK_TYPES.common.positiveKeyboard,
] as const;
