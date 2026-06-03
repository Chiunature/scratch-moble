import { TOOLBOX_AT_RIGHT } from "scratch-blocks";

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
    /** 键盘输入数字阴影（任意实数；历史 type 名 math_positive_number_keyboard 保留兼容） */
    positiveKeyboard: 'math_positive_number_keyboard',
    /** 矩阵灯列坐标阴影（0 ~ MATRIX_LIGHT_COL_COUNT-1，默认 5 列） */
    basicDropdownNumCol: 'basic_dropdown_num_col',
    /** 矩阵灯行坐标阴影（0 ~ MATRIX_LIGHT_ROW_COUNT-1，默认 7 行） */
    basicDropdownNumRow: 'basic_dropdown_num_row',
    /** 音符选择阴影（pitch 0–36 存盘；codegen 经 pitchToDisplayName 输出音名） */
    notePicker: 'note_picker',
    /** 手柄按键选择阴影（按键名字符串） */
    handleShankPicker: 'handle_shank_picker',
  },
  motor: {
    runForPowerSeconds: 'run_for_power_seconds',
    runPower: 'run_power',
    stop: 'stop',
    stopModule: 'stop_module',
  },
  move: {
    pair: 'pair',
    moveSetStopModule: 'mov_set_stop_module',
    movDirPowerSeconds: 'mov_dir_power_seconds',
    movDirPower: 'mov_dir_power',
    movStop: 'mov_stop',
    movForPowerSeconds: 'mov_for_power_seconds',
    movPower: 'mov_power',
    movFindLineInit: 'mov_find_line_init',
    movFindLineRun: 'mov_find_line_run',
  },
  matrixLight: {
    show: 'show',
    clear: 'clear',
    setBrightness: 'set_brightness',
    showRoll: 'show_roll',
    setPixelBrightness: 'set_pixel_brightness',
  },
  sound: {
    playMusic: 'play_music',
  },
  event: {
    whenFlagClicked: 'event_when_flag_clicked',
  },
  control: {
    sleepS: 'sleep_s',
    wait: 'control_wait',
    break: 'control_break',
    whileTimes: 'control_while_times',
    while: 'control_while',
    if: 'control_if',
    ifElse: 'control_if_else',
    whileDo: 'control_while_do',
    stopExit: 'control_stop_exit',
  },
  sensor: {
    touch_sensor: {
      state: 'state',
    },
    gray_sensor: {
      cmpLux: 'cmp_lux',
      lux:"lux",
      setColorThresholdValue: 'set_color_threshold_value',
      luxState:"lux_state",
      oneCalibrate:"one_calibrate",
      twoCalibrate:"two_calibrate"

    },
    ultrasonic_sensor: {
      cmpValue: 'cmp_value',
      value: 'value',
    },
    remote_control_sensor: {
      keyRemote: 'key_remote',
      movSetAdvanceOffset:"mov_set_advance_offset",
      movSetRetreatOffset:"mov_set_retreat_offset",
      readAdcanceLeftOffset:"read_adcance_left_offset",
      readAdvanceRightOffset:"read_advance_right_offset",
      readRetreatLeftOffset:"read_retreat_left_offset",
      readRetreatRightOffset:"read_retreat_right_offset",
    },
    other:{
      keyMast:'key_mast',
      timer:"timer",
      resetTimer:"resetTimer",
    }
  },
} as const;

/** 自定义数字字面量/阴影块（字段 NUM），供 codegen 等与 scratch 内置 math_* 一并处理 */
export const CUSTOM_NUMERIC_LITERAL_TYPES = [
  BLOCK_TYPES.common.integerSlider,
  BLOCK_TYPES.common.decimalSlider,
  BLOCK_TYPES.common.positiveKeyboard,
  BLOCK_TYPES.common.basicDropdownNumCol,
  BLOCK_TYPES.common.basicDropdownNumRow,
] as const;
