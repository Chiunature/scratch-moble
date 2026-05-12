/**
 * 左侧工具箱分类图标资源。
 *
 * - `assets/toolbox/*.svg` 经 esbuild 插件打成 **文本** 内联进 bundle，供 DOM 内嵌 `<svg>`。
 * - 其它目录的 `.svg` 仍为 data URL（如缩放按钮）。
 *
 * - TOOLBOX_SVG_MARKUP：全部 toolbox SVG 字符串，按资源语义命名。
 * - TOOLBOX_CATEGORY_ICON_SVG_BY_ID：分类 id → SVG 文本。
 *
 * 与 toolbox.ts 中 TOOLBOX_CATEGORIES 的 id 对应。
 */
import combinedMotorMarkup from '../../assets/toolbox/combined_motor.svg';
import matrixMarkup from '../../assets/toolbox/matrix.svg';
import motorMarkup from '../../assets/toolbox/motor.svg';
import musicMarkup from '../../assets/toolbox/music.svg';
import startProgramMarkup from '../../assets/toolbox/start_program.svg';
import customizeBlockMarkup from '../../assets/toolbox/customize_block.svg';
import loopMarkup from '../../assets/toolbox/loop.svg';
import operationMarkup from '../../assets/toolbox/operation.svg';
import sensorMarkup from '../../assets/toolbox/sensor.svg';
import variableMarkup from '../../assets/toolbox/variable.svg';

const asMarkup = (u: unknown): string => u as string;

/** 分类 id 与 toolboxJson / TOOLBOX_CATEGORIES 一致，将assets/toolbox目录下的svg文件转换为字符串 */
export const TOOLBOX_SVG_MARKUP = {
  combinedMotor: asMarkup(combinedMotorMarkup),
  matrix: asMarkup(matrixMarkup),
  motor: asMarkup(motorMarkup),
  music: asMarkup(musicMarkup),
  startProgram: asMarkup(startProgramMarkup),
  customizeBlock: asMarkup(customizeBlockMarkup),
  loop: asMarkup(loopMarkup),
  operation: asMarkup(operationMarkup),
  sensor: asMarkup(sensorMarkup),
  variable: asMarkup(variableMarkup),
} as const;

/** 分类 id 与 toolboxJson / TOOLBOX_CATEGORIES 一致 ，根据分类id获取对应的svg字符串 */
export const TOOLBOX_CATEGORY_ICON_SVG_BY_ID: Record<string, string> = {
  motor: TOOLBOX_SVG_MARKUP.motor,
  move: TOOLBOX_SVG_MARKUP.combinedMotor,
  matrixLight: TOOLBOX_SVG_MARKUP.matrix,
  sound: TOOLBOX_SVG_MARKUP.music,
  event: TOOLBOX_SVG_MARKUP.startProgram,
  control: TOOLBOX_SVG_MARKUP.loop,
  sensor: TOOLBOX_SVG_MARKUP.sensor,
  operation: TOOLBOX_SVG_MARKUP.operation,
  variable: TOOLBOX_SVG_MARKUP.variable,
  customBlock: TOOLBOX_SVG_MARKUP.customizeBlock,
};
