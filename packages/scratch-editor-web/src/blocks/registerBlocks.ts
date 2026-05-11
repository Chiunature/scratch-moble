/**
 * 积木定义注册入口：按分类拆在 blockDefinitions/ 下，此处只做聚合与一次性注册。
 *
 * type 必须与 blockTypes.ts 一致；toolbox.ts 引用的每个 type 都要在某分类文件中定义。
 */
import * as ScratchBlocks from 'scratch-blocks';

import { controlBlockDefinitions } from './blockDefinitions/control';
import { eventBlockDefinitions } from './blockDefinitions/event';
import { matrixLightBlockDefinitions } from './blockDefinitions/matrixLight';
import { motorBlockDefinitions } from './blockDefinitions/motor';
import { moveBlockDefinitions } from './blockDefinitions/move';
import { sensorBlockDefinitions } from './blockDefinitions/sensor';
import { soundBlockDefinitions } from './blockDefinitions/sound';

export function registerEditorBlocks(): void {
  ScratchBlocks.defineBlocksWithJsonArray([
    ...motorBlockDefinitions,
    ...moveBlockDefinitions,
    ...matrixLightBlockDefinitions,
    ...soundBlockDefinitions,
    ...eventBlockDefinitions,
    ...controlBlockDefinitions,
    ...sensorBlockDefinitions,
  ]);
}
