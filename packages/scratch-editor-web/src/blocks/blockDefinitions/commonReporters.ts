/**
 * 公用 reporter 阴影（端口下拉、数字滑块/键盘、音符选择）聚合注册。
 * 定义见 portDropdown.ts、numberShadowReporters.ts、noteShadowReporter.ts。
 */
import { numberShadowReporterDefinitions } from './numberShadowReporters';
import { noteShadowReporterDefinitions } from './noteShadowReporter';
import { portDropdownReporterDefinitions } from './portDropdown';
import { basicDropdownNumBlockDefinitions } from './BasicDropdownNum';
import { handleShankShadowReporterDefinitions } from './handleShankShadowReporter';

export const commonReporterDefinitions = [
  ...numberShadowReporterDefinitions,
  ...noteShadowReporterDefinitions,
  ...portDropdownReporterDefinitions,
  ...basicDropdownNumBlockDefinitions,
  ...handleShankShadowReporterDefinitions,
] as const;
