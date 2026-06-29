import * as BlocklyEn from 'blockly/msg/en';
import * as BlocklyZhHans from 'blockly/msg/zh-hans';
import * as ScratchBlocks from 'scratch-blocks';

export type ScratchBlocksLocale = 'zh-cn' | 'en';

/**
 * 加载 Scratch 与 Blockly 文案。
 *
 * scratch-blocks 基于 blockly/core ESM，不会自动注入 Blockly 默认 Msg。
 * 上下文菜单（折叠、复制注释等）仍读取 Blockly.Msg.*；键缺失时 text 为
 * undefined，渲染菜单会在 MenuItem.createDom 里触发 appendChild 报错。
 */
export function initScratchLocale(locale: ScratchBlocksLocale): void {
  if (locale === 'en') {
    Object.assign(ScratchBlocks.Msg, BlocklyEn);
    ScratchBlocks.ScratchMsgs.setLocale('en');
    return;
  }

  Object.assign(ScratchBlocks.Msg, BlocklyZhHans);
  ScratchBlocks.ScratchMsgs.setLocale('zh-cn');
}

export function getScratchBlocksLocale(): ScratchBlocksLocale {
  return ScratchBlocks.ScratchMsgs.getLocale() === 'en' ? 'en' : 'zh-cn';
}
