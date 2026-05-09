/**
 * 替换左侧工具箱分类图标。
 *
 * scratch-blocks / Blockly 注入后，分类项的 getId() 往往是 blockly-1 这类自动生成 id，
 * 与 toolbox JSON 里配置的 id（如 event）不一致。
 *
 * Blockly 分类行的真实 DOM 结构：
 *
 *   .blocklyToolboxCategoryContainer   ← item.getDiv()
 *     └─ .blocklyToolboxCategory
 *          └─ .blocklyTreeRowContentContainer
 *               ├─ .categoryBubble     ← 彩色圆点（隐藏）
 *               └─ .blocklyToolboxCategoryLabel  ← 文字（替换为 <img>）
 *
 * 本模块只修改 .blocklyTreeRowContentContainer 内部，保留外层结构，
 * 使 Blockly 的选中态、hover、焦点等行为不受影响。
 *
 * 图标 URL 由 blocks/toolboxCategoryIconUrls.ts 集中导入；
 * 分类 id / displayText 由 toolbox.ts 的 TOOLBOX_CATEGORIES 维护。
 */
import type { IToolboxItem, Toolbox } from 'blockly/core';

import type { Workspace } from '../codegen/types';
import { TOOLBOX_CATEGORIES } from '../blocks/toolbox';
import { TOOLBOX_CATEGORY_ICON_URL_BY_ID } from '../blocks/toolboxCategoryIconUrls';

// ─── 配置：新增分类先在 toolbox.ts 追加，再在 toolboxCategoryIconUrls 补 URL ───

const ICON_URL_BY_ID = TOOLBOX_CATEGORY_ICON_URL_BY_ID;

/** 由 TOOLBOX_CATEGORIES 派生，供 O(1) 查询 */
const ICON_BY_ID: Record<string, string> = Object.fromEntries(
  TOOLBOX_CATEGORIES.map(c => [c.id, ICON_URL_BY_ID[c.id] ?? '']),
);

/** 由 TOOLBOX_CATEGORIES 派生，根据分类文案反查逻辑 id */
const ID_BY_TEXT: Record<string, string> = Object.fromEntries(
  TOOLBOX_CATEGORIES.map(c => [c.displayText, c.id]),
);

// ─── Blockly DOM 节点选择器（与 scratch-blocks 2.x 的 DOM 结构对应）─────────

const SEL_ROW = '.blocklyTreeRowContentContainer';
const SEL_BUBBLE = '.categoryBubble';
const SEL_LABEL = '.blocklyToolboxCategoryLabel';

const ICON_CLASS = 'toolbox-category-icon';
const ICON_CLASS_PREFIX = `${ICON_CLASS}-`;

const ICON_SIZE_PX = 24;

// ─── 分类 id 解析 ─────────────────────────────────────────────────────────────

/**
 * 解析逻辑分类 id，优先级从高到低：
 * 1) 上次 patch 写入的 data-toolbox-category-id（不受后续 DOM 变动影响）
 * 2) Blockly 生成的原始 id（极少情况下恰好与配置 id 一致时）
 * 3) .blocklyToolboxCategoryLabel 的文案（首轮 patch 时文字还在，最稳的文本来源）
 */
function resolveCategoryId(
  generatedId: string,
  itemDiv: HTMLElement | null,
): string | null {
  if (itemDiv) {
    const patchedId = itemDiv.dataset.toolboxCategoryId;
    if (patchedId && ICON_BY_ID[patchedId]) {
      return patchedId;
    }
  }

  if (ICON_BY_ID[generatedId]) {
    return generatedId;
  }

  if (itemDiv) {
    const labelText = itemDiv.querySelector(SEL_LABEL)?.textContent?.trim();
    if (labelText && ID_BY_TEXT[labelText]) {
      return ID_BY_TEXT[labelText];
    }
  }

  return null;
}

// ─── DOM 操作 ─────────────────────────────────────────────────────────────────

function buildIconClassName(categoryId: string): string {
  return `${ICON_CLASS} ${ICON_CLASS_PREFIX}${categoryId}`;
}

/**
 * 在 .blocklyTreeRowContentContainer 内精准操作：
 * - 隐藏 .categoryBubble（彩色圆点），不移除，保留 DOM 结构完整性
 * - 找到 .blocklyToolboxCategoryLabel，替换其内容为 <img>（复用已有节点避免重复创建）
 *
 * 外层 .blocklyToolboxCategoryContainer / .blocklyToolboxCategory 保持不变，
 * 确保 Blockly 的选中态、hover、焦点逻辑不受影响。
 */
function patchRowContent(
  itemDiv: HTMLElement,
  categoryId: string,
  iconUrl: string,
): void {
  itemDiv.dataset.toolboxCategoryId = categoryId;

  const row = itemDiv.querySelector(SEL_ROW) as HTMLElement | null;
  if (!row) {
    return;
  }

  // 隐藏彩色圆点
  const bubble = row.querySelector(SEL_BUBBLE) as HTMLElement | null;
  if (bubble) {
    bubble.style.display = 'none';
  }

  // 找到或创建图标节点，放入 label 容器
  const label = row.querySelector(SEL_LABEL) as HTMLElement | null;
  if (!label) {
    return;
  }

  let icon = label.querySelector(`.${ICON_CLASS}`) as HTMLImageElement | null;
  if (!icon) {
    icon = document.createElement('img');
    icon.alt = '';
    icon.setAttribute('aria-hidden', 'true');
    label.replaceChildren(icon);
  }

  icon.className = buildIconClassName(categoryId);
  icon.src = iconUrl;
  Object.assign(icon.style, {
    display: 'block',
    height: `${ICON_SIZE_PX}px`,
    margin: '0 auto',
    objectFit: 'contain',
    width: `${ICON_SIZE_PX}px`,
  });

  // label 容器居中
  Object.assign(label.style, {
    display: 'flex',
    justifyContent: 'center',
    padding: '0',
  });

  // row 容器纵向排列（去掉原来横向 bubble + text 布局）
  Object.assign(row.style, {
    alignItems: 'center',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    padding: '10px 8px',
  });
}

// ─── 入口 ─────────────────────────────────────────────────────────────────────

function processToolboxItem(item: IToolboxItem): void {
  const generatedId = item.getId();
  const itemDiv = item.getDiv() as HTMLElement | null;

  const categoryId = resolveCategoryId(generatedId, itemDiv);
  if (!categoryId || !itemDiv) {
    return;
  }

  patchRowContent(itemDiv, categoryId, ICON_BY_ID[categoryId]);
}

/**
 * 启用工具箱滚动功能
 * 设置工具箱容器高度并启用 overflow-y 滚动
 */
function enableToolboxScrolling(workspace: Workspace): void {
  const toolbox = workspace.getToolbox?.() as Toolbox | null;
  if (!toolbox) return;

  // 获取工具箱的 HTML 元素
  const toolboxDiv = (toolbox as unknown as { HtmlDiv?: HTMLElement }).HtmlDiv;
  if (!toolboxDiv) return;

  // 设置工具箱样式以支持滚动
  Object.assign(toolboxDiv.style, {
    height: '100%',
    overflowY: 'auto',
    overflowX: 'hidden',
  });

  // 获取工具箱内容容器并设置高度
  const toolboxContent = toolboxDiv.querySelector('.blocklyToolboxContents') as HTMLElement | null;
  if (toolboxContent) {
    Object.assign(toolboxContent.style, {
      minHeight: '100%',
    });
  }

  // 隐藏默认的Blockly滚动条（如果存在）
  const scrollbar = toolboxDiv.querySelector('.blocklyToolboxScrollbar') as HTMLElement | null;
  if (scrollbar) {
    scrollbar.style.display = 'none';
  }
}

/** 对工作区内所有工具箱分类项应用自定义图标（可在 inject / resize 后多次调用） */
export function patchToolboxCategoryIcons(workspace: Workspace): void {
  const toolbox = workspace.getToolbox?.() as Toolbox | null;
  if (!toolbox) {
    return;
  }

  for (const item of toolbox.getToolboxItems()) {
    processToolboxItem(item);
  }

  // 启用工具箱滚动
  enableToolboxScrolling(workspace);
}
