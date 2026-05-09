/**
 * 所有积木的 type ID 集中在这里管理。
 * 新增积木时先在此处注册，再去 registerBlocks.ts / toolbox.ts / generators.ts 补充实现。
 */
export const BLOCK_TYPES = {
  motor: {
    runForPowerSeconds: 'motor_run_for_power_seconds',
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
