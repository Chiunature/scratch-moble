/**
 * 左侧工具箱分类图标资源（esbuild 将 .svg 打成 data URL）。
 *
 * - TOOLBOX_SVG_URLS：全部 SVG 的唯一来源，按资源语义命名。
 * - TOOLBOX_CATEGORY_ICON_URL_BY_ID：分类 id → URL，只引用上面常量，避免重复 asUrl。
 *
 * 与 toolbox.ts 中 TOOLBOX_CATEGORIES 的 id 对应；调整映射只改 BY_ID 即可。
 */
import combinedMotorUrl from '../../assets/toolbox/combined_motor.svg';
import grayScaleUrl from '../../assets/toolbox/gray_scale.svg';
import handleShankUrl from '../../assets/toolbox/handleShank.svg';
import matrixUrl from '../../assets/toolbox/matrix.svg';
import motorSensingUrl from '../../assets/toolbox/motor_sensing.svg';
import musicUrl from '../../assets/toolbox/music.svg';
import startProgramUrl from '../../assets/toolbox/start_program.svg';
import touchUrl from '../../assets/toolbox/touch.svg';
import ultrasonicUrl from '../../assets/toolbox/ultrasonic.svg';

/** esbuild 将 .svg 打成 data URL；此处统一收窄为 string，避免与 RN 侧 Svg 组件类型冲突 */
const asUrl = (u: unknown): string => u as string;

/** 全部 toolbox SVG（含暂未挂到分类上的资源，如 touch / ultrasonic / combinedMotor） */
export const TOOLBOX_SVG_URLS = {
  combinedMotor: asUrl(combinedMotorUrl),
  grayScale: asUrl(grayScaleUrl),
  handleShank: asUrl(handleShankUrl),
  matrix: asUrl(matrixUrl),
  motorSensing: asUrl(motorSensingUrl),
  music: asUrl(musicUrl),
  startProgram: asUrl(startProgramUrl),
  touch: asUrl(touchUrl),
  ultrasonic: asUrl(ultrasonicUrl),
} as const;

/** 分类 id 与 toolboxJson / TOOLBOX_CATEGORIES 一致 */
export const TOOLBOX_CATEGORY_ICON_URL_BY_ID: Record<string, string> = {
  motor: TOOLBOX_SVG_URLS.motorSensing,
  move: TOOLBOX_SVG_URLS.grayScale,
  matrixLight: TOOLBOX_SVG_URLS.matrix,
  sound: TOOLBOX_SVG_URLS.music,
  event: TOOLBOX_SVG_URLS.startProgram,
  control: TOOLBOX_SVG_URLS.handleShank,
  sensor: TOOLBOX_SVG_URLS.motorSensing,
  operation: TOOLBOX_SVG_URLS.matrix,
  variable: TOOLBOX_SVG_URLS.music,
  customBlock: TOOLBOX_SVG_URLS.startProgram,
};
