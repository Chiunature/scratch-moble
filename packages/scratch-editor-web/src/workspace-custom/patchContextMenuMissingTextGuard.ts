import * as ScratchBlocks from 'scratch-blocks';

/**
 * 过滤 text 为空的上下文菜单项，避免 MenuItem.createDom 抛 appendChild 错误。
 */
export function patchContextMenuMissingTextGuard(): void {
  const registry = ScratchBlocks.ContextMenuRegistry.registry;
  const originalGetOptions = registry.getContextMenuOptions.bind(registry);

  registry.getContextMenuOptions = (scope, menuOpenEvent) => {
    const options = originalGetOptions(scope, menuOpenEvent);
    return options.filter((option) => {
      if (option.separator) {
        return true;
      }
      const text = option.text;
      if (text === undefined || text === null) {
        console.warn('[scratch-editor-web] Dropped context menu item with missing text', option);
        return false;
      }
      return true;
    });
  };
}
