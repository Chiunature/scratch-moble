import { tEditor } from '@scratch-mobile/i18n';

import { toolboxCategoryIconClasses } from './shared';

type ToolboxCategoryConfig = {
  id: string;
  categorystyle: string;
  contents?: readonly unknown[];
  custom?: string;
};

export function buildToolboxCategory(config: ToolboxCategoryConfig) {
  const { id, categorystyle, ...rest } = config;
  return {
    kind: 'category' as const,
    id,
    name: tEditor(`toolbox.${id}`),
    categorystyle,
    cssconfig: {
      icon: toolboxCategoryIconClasses(id),
    },
    ...rest,
  };
}
