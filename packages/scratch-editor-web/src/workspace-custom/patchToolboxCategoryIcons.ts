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
 *               └─ .blocklyToolboxCategoryLabel  ← 文字（替换为内联 <svg>）
 *
 * 本模块只修改 .blocklyTreeRowContentContainer 内部，保留外层结构，
 * 使 Blockly 的选中态、hover、焦点等行为不受影响。
 *
 * 图标 SVG 在 toolboxCategoryIconUrls；分类 id / 文案 / 颜色在 toolbox.ts 的 TOOLBOX_CATEGORIES。
 */
import type { Toolbox } from 'blockly/core';

import type { Workspace } from '../codegen/types';
import { TOOLBOX_CATEGORIES } from '../blocks/toolbox';
import { TOOLBOX_CATEGORY_ICON_SVG_BY_ID } from '../blocks/toolboxCategoryIconUrls';

/** 从 TOOLBOX_CATEGORIES 一次遍历得到图标 / 颜色 / 文案反查，避免三份 map 各自 fromEntries */
function buildToolboxCategoryLookups(): {
  iconById: Record<string, string>;
  colourById: Record<string, string>;
  idByText: Record<string, string>;
} {
  const iconById: Record<string, string> = {};
  const colourById: Record<string, string> = {};
  const idByText: Record<string, string> = {};
  for (const c of TOOLBOX_CATEGORIES) {
    iconById[c.id] = TOOLBOX_CATEGORY_ICON_SVG_BY_ID[c.id] ?? '';
    colourById[c.id] = c.colour;
    idByText[c.displayText] = c.id;
  }
  return { iconById, colourById, idByText };
}

const {
  iconById: ICON_BY_ID,
  colourById: COLOUR_BY_ID,
  idByText: ID_BY_TEXT,
} = buildToolboxCategoryLookups();

// ─── Blockly DOM 节点选择器（与 scratch-blocks 2.x 的 DOM 结构对应）─────────

const SEL_ROW = '.blocklyTreeRowContentContainer';
const SEL_BUBBLE = '.categoryBubble';
const SEL_LABEL = '.blocklyToolboxCategoryLabel';

const ICON_CLASS = 'toolbox-category-icon';
const ICON_CLASS_PREFIX = `${ICON_CLASS}-`;

const ICON_SIZE_PX = 24;

const svgParser = new DOMParser();
const SVG_NS_PREFIX = 'toolbox-svg';
const svgTemplateByCategoryId = new Map<string, SVGSVGElement | null>();

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

/** 返回 SVG 根及其所有后代元素，供批量改写 class、id、属性时遍历 */
function getSvgElements(svg: SVGSVGElement): Element[] {
  return [svg, ...svg.querySelectorAll('*')];
}

/** 移除 script 与事件型属性（on*），降低内联 SVG 被滥用的风险 */
function sanitizeToolboxSvgRoot(svg: SVGSVGElement): void {
  for (const el of svg.querySelectorAll('script')) {
    el.remove();
  }
  for (const node of getSvgElements(svg)) {
    for (const { name } of [...node.attributes]) {
      if (name.startsWith('on')) {
        node.removeAttribute(name);
      }
    }
  }
}

/**
 * 把 SVG 内所有 class 加上命名空间前缀，并同步改写 <style> 里的选择器，
 * 使同一页面多份相同素材的 CSS 互不覆盖
 */
function namespaceSvgClasses(svg: SVGSVGElement, namespace: string): void {
  const classNames = new Set<string>();
  for (const node of getSvgElements(svg)) {
    for (const className of node.getAttribute('class')?.split(/\s+/) ?? []) {
      if (className) {
        classNames.add(className);
      }
    }
  }

  if (!classNames.size) {
    return;
  }

  const scopedClassName = new Map(
    [...classNames].map(className => [className, `${namespace}-${className}`]),
  );

  for (const style of svg.querySelectorAll('style')) {
    style.textContent =
      style.textContent?.replace(
        /\.([_a-zA-Z][\w-]*)/g,
        (match, className: string) => {
          const scoped = scopedClassName.get(className);
          return scoped ? `.${scoped}` : match;
        },
      ) ?? '';
  }

  for (const node of getSvgElements(svg)) {
    if (!node.hasAttribute('class')) {
      continue;
    }
    const scoped = (node.getAttribute('class') ?? '')
      .split(/\s+/)
      .filter(Boolean)
      .map(className => scopedClassName.get(className) ?? className)
      .join(' ');
    node.setAttribute('class', scoped);
  }
}

/**
 * 为 SVG 内所有 id 加前缀，并替换 <style>、属性值中的 url(#id)、#id 引用，
 * 避免渐变、裁剪路径等与另一分类图标重复 id
 */
function namespaceSvgIds(svg: SVGSVGElement, namespace: string): void {
  const idByOriginal = new Map<string, string>();
  for (const node of getSvgElements(svg)) {
    const id = node.getAttribute('id');
    if (id) {
      idByOriginal.set(id, `${namespace}-${id}`);
    }
  }

  if (!idByOriginal.size) {
    return;
  }

  for (const node of getSvgElements(svg)) {
    const id = node.getAttribute('id');
    if (id) {
      node.setAttribute('id', idByOriginal.get(id) ?? id);
    }
  }

  for (const style of svg.querySelectorAll('style')) {
    let text = style.textContent ?? '';
    for (const [oldId, newId] of idByOriginal) {
      text = text
        .replaceAll(`url(#${oldId})`, `url(#${newId})`)
        .replaceAll(`#${oldId}`, `#${newId}`);
    }
    style.textContent = text;
  }

  for (const node of getSvgElements(svg)) {
    for (const attr of [...node.attributes]) {
      let value = attr.value;
      for (const [oldId, newId] of idByOriginal) {
        value = value
          .replaceAll(`url(#${oldId})`, `url(#${newId})`)
          .replaceAll(`#${oldId}`, `#${newId}`);
      }
      if (value !== attr.value) {
        node.setAttribute(attr.name, value);
      }
    }
  }
}

/**
 * 解析 SVG 字符串并做清理与 class/id 命名空间（多图标同页避免 .cls-*、#id 冲突），
 * 按分类缓存模板；插入 DOM 时返回深拷贝节点
 */
function cloneToolboxSvgIcon(
  categoryId: string,
  markup: string,
): SVGSVGElement | null {
  if (!svgTemplateByCategoryId.has(categoryId)) {
    const doc = svgParser.parseFromString(markup, 'image/svg+xml');
    const parsed = doc.querySelector('svg');
    let template: SVGSVGElement | null = null;
    if (parsed instanceof SVGSVGElement) {
      const namespace = `${SVG_NS_PREFIX}-${categoryId}`;
      sanitizeToolboxSvgRoot(parsed);
      namespaceSvgClasses(parsed, namespace);
      namespaceSvgIds(parsed, namespace);
      template = parsed;
    }
    svgTemplateByCategoryId.set(categoryId, template);
  }

  const cached = svgTemplateByCategoryId.get(categoryId);
  return cached ? document.importNode(cached, true) : null;
}

/**
 * 在 .blocklyTreeRowContentContainer 内精准操作：
 * - 隐藏 .categoryBubble（彩色圆点），不移除，保留 DOM 结构完整性
 * - 找到 .blocklyToolboxCategoryLabel，替换其内容为内联 <svg>
 *
 * 外层 .blocklyToolboxCategoryContainer / .blocklyToolboxCategory 保持不变，
 * 确保 Blockly 的选中态、hover、焦点逻辑不受影响。
 */
function patchRowContent(
  itemDiv: HTMLElement,
  categoryId: string,
  svgMarkup: string,
): void {
  itemDiv.dataset.toolboxCategoryId = categoryId;

  const colour = COLOUR_BY_ID[categoryId];
  if (colour) {
    itemDiv.style.setProperty('--scratch-toolbox-selected-bg', colour);
  }

  const row = itemDiv.querySelector(SEL_ROW) as HTMLElement | null;
  if (!row) {
    return;
  }

  const bubble = row.querySelector(SEL_BUBBLE) as HTMLElement | null;
  if (bubble) {
    bubble.style.display = 'none';
  }

  const label = row.querySelector(SEL_LABEL) as HTMLElement | null;
  if (!label) {
    return;
  }

  const icon = cloneToolboxSvgIcon(categoryId, svgMarkup);
  if (!icon) {
    return;
  }
  icon.setAttribute('focusable', 'false');
  icon.setAttribute('aria-hidden', 'true');
  icon.setAttribute('class', `${ICON_CLASS} ${ICON_CLASS_PREFIX}${categoryId}`);

  label.replaceChildren(icon);
}

// ─── 入口 ─────────────────────────────────────────────────────────────────────

/**
 * 遍历工作区工具箱的全部分类项，为每一项应用自定义 SVG 图标。
 * 可在 Blockly inject、窗口 resize 等之后重复调用以修复被重绘的 DOM
 */
export function patchToolboxCategoryIcons(workspace: Workspace): void {
  const toolbox = workspace.getToolbox?.() as Toolbox | null;
  if (!toolbox) {
    return;
  }

  for (const item of toolbox.getToolboxItems()) {
    const generatedId = item.getId();
    const itemDiv = item.getDiv() as HTMLElement | null;
    const categoryId = resolveCategoryId(generatedId, itemDiv);
    if (categoryId && itemDiv) {
      patchRowContent(itemDiv, categoryId, ICON_BY_ID[categoryId]);
    }
  }
}
