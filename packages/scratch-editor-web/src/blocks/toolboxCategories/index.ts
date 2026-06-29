import { controlToolboxCategory } from './control';
import { customBlockToolboxCategory } from './customBlock';
import { eventToolboxCategory } from './event';
import { matrixLightToolboxCategory } from './matrixLight';
import { motorToolboxCategory } from './motor';
import { moveToolboxCategory } from './move';
import { operationToolboxCategory } from './operation';
import { sensorToolboxCategory } from './sensor';
import { soundToolboxCategory } from './sound';
import { variableToolboxCategory } from './variable';

export { getToolboxCategories, TOOLBOX_CATEGORY_DEFS } from './shared';
export type { ToolboxCategoryId } from './shared';

export function getToolboxCategoryContents() {
  return [
    motorToolboxCategory(),
    moveToolboxCategory(),
    matrixLightToolboxCategory(),
    soundToolboxCategory(),
    eventToolboxCategory(),
    controlToolboxCategory(),
    sensorToolboxCategory(),
    operationToolboxCategory(),
    variableToolboxCategory(),
    customBlockToolboxCategory(),
  ];
}
