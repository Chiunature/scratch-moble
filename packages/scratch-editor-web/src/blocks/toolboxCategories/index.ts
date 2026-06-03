import { controlToolboxCategory } from './control';
import { eventToolboxCategory } from './event';
import { matrixLightToolboxCategory } from './matrixLight';
import { motorToolboxCategory } from './motor';
import { moveToolboxCategory } from './move';
import { operationToolboxCategory } from './operation';
import { sensorToolboxCategory } from './sensor';
import { soundToolboxCategory } from './sound';

export { TOOLBOX_CATEGORIES } from './shared';

export const toolboxCategoryContents = [
  motorToolboxCategory,
  moveToolboxCategory,
  matrixLightToolboxCategory,
  soundToolboxCategory,
  eventToolboxCategory,
  controlToolboxCategory,
  sensorToolboxCategory,
  operationToolboxCategory,
] as const;
