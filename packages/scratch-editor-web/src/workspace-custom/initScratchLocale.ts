import * as BlocklyZhHans from 'blockly/msg/zh-hans';
import * as ScratchBlocks from 'scratch-blocks';

/**
 * 加载 Scratch 与 Blockly 中文文案。
 *
 * scratch-blocks 基于 blockly/core ESM，不会自动注入 Blockly 默认 Msg。
 * 上下文菜单（折叠、复制注释等）仍读取 Blockly.Msg.*；键缺失时 text 为
 * undefined，渲染菜单会在 MenuItem.createDom 里触发 appendChild 报错。
 */
export function initScratchLocale(locale: 'zh-cn' = 'zh-cn'): void {
  Object.assign(ScratchBlocks.Msg, BlocklyZhHans);
  ScratchBlocks.ScratchMsgs.setLocale(locale);
}
