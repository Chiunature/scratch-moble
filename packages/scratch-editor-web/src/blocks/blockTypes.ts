/**
 * 所有积木的 type ID 集中在这里管理。
 * 新增积木时先在此处注册，再在 blockDefinitions/<分类>.ts、toolbox.ts、generators.ts 补充实现。
 */
export const BLOCK_TYPES = {
  common: {
    /** 通用端口下拉报告块（Number），可作为任意 PORT/PORTS 输入槽的默认阴影 */
    portDropdown: 'port_dropdown',
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
