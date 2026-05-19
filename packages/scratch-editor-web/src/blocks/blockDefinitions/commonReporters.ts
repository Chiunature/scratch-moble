/**
 * 公用 reporter 阴影（端口下拉、数字滑块/键盘）聚合注册。
 * 定义见 portDropdown.ts、numberShadowReporters.ts。
 */
import { numberShadowReporterDefinitions } from './numberShadowReporters';
import { portDropdownReporterDefinitions } from './portDropdown';

export const commonReporterDefinitions = [
  ...numberShadowReporterDefinitions,
  ...portDropdownReporterDefinitions,
] as const;
