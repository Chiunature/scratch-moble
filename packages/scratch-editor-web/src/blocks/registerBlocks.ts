/**
 * 积木定义注册入口：按分类拆在 blockDefinitions/ 下，此处只做聚合与注册。
 *
 * type 必须与 blockTypes.ts 一致；公用阴影在 commonReporters，分类主积木在 blockDefinitions/<分类>.ts。
 */
import * as ScratchBlocks from 'scratch-blocks';

import { getControlBlockDefinitions } from './blockDefinitions/control';
import { commonReporterDefinitions } from './blockDefinitions/commonReporters';
import { getEventBlockDefinitions } from './blockDefinitions/event';
import { getMatrixLightBlockDefinitions } from './blockDefinitions/matrixLight';
import { getMotorBlockDefinitions } from './blockDefinitions/motor';
import { getMoveBlockDefinitions } from './blockDefinitions/move';
import { getSensorBlockDefinitions } from './blockDefinitions/sensor';
import { getSoundBlockDefinitions } from './blockDefinitions/sound';
import { registerPortDropdownExtensions } from './portDropdownExtensions';

export function getEditorBlockDefinitions() {
  return [
    ...commonReporterDefinitions,
    ...getMotorBlockDefinitions(),
    ...getMoveBlockDefinitions(),
    ...getMatrixLightBlockDefinitions(),
    ...getSoundBlockDefinitions(),
    ...getEventBlockDefinitions(),
    ...getControlBlockDefinitions(),
    ...getSensorBlockDefinitions(),
  ];
}

export function registerEditorBlocks(): void {
  registerPortDropdownExtensions();
  ScratchBlocks.defineBlocksWithJsonArray(getEditorBlockDefinitions());
}
