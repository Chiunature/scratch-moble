/**
 * 积木定义注册入口：按分类拆在 blockDefinitions/ 下，此处只做聚合与一次性注册。
 *
 * type 必须与 blockTypes.ts 一致；公用阴影在 commonReporters，分类主积木在 blockDefinitions/<分类>.ts。
 */
import * as ScratchBlocks from 'scratch-blocks';

import { controlBlockDefinitions } from './blockDefinitions/control';
import { commonReporterDefinitions } from './blockDefinitions/commonReporters';
import { eventBlockDefinitions } from './blockDefinitions/event';
import { matrixLightBlockDefinitions } from './blockDefinitions/matrixLight';
import { motorBlockDefinitions } from './blockDefinitions/motor';
import { moveBlockDefinitions } from './blockDefinitions/move';
import { sensorBlockDefinitions } from './blockDefinitions/sensor';
import { soundBlockDefinitions } from './blockDefinitions/sound';
import { registerPortDropdownExtensions } from './portDropdownExtensions';

export function registerEditorBlocks(): void {
  registerPortDropdownExtensions();
  ScratchBlocks.defineBlocksWithJsonArray([
    ...commonReporterDefinitions,
    ...motorBlockDefinitions,
    ...moveBlockDefinitions,
    ...matrixLightBlockDefinitions,
    ...soundBlockDefinitions,
    ...eventBlockDefinitions,
    ...controlBlockDefinitions,
    ...sensorBlockDefinitions,
  ]);
}
