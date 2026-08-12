/**
 * 将 workspace 内积木渲染为 JPEG dataURL（作品列表封面用）。
 *
 * 思路：克隆 block canvas（<g>），把关键 computed style 内联到克隆节点，
 * 再清理 canvg 不稳定支持的交互/资源节点，包成独立 SVG 后渲染到 canvas。
 * 空 workspace 或渲染失败返回 undefined。
 */
import { Canvg } from 'canvg';

import type { Workspace } from '../codegen/types';

const THUMBNAIL_PADDING_PX = 12;
const THUMBNAIL_SIZE_PX = 480;
const JPEG_QUALITY = 0.85;

type SvgWorkspace = Workspace & {
  getCanvas?: () => SVGGElement | null;
};

const INLINE_STYLE_PROPERTIES = [
  'fill',
  'fill-opacity',
  'stroke',
  'stroke-width',
  'stroke-linecap',
  'stroke-linejoin',
  'stroke-opacity',
  'opacity',
  'font-family',
  'font-size',
  'font-style',
  'font-weight',
  'text-anchor',
  'dominant-baseline',
  'display',
  'visibility',
] as const;

const UNSUPPORTED_EXPORT_SELECTOR = [
  'defs',
  'style',
  'script',
  'foreignObject',
  'filter',
  'mask',
  'pattern',
  'clipPath',
  'image',
  'use',
  'animate',
  'animateTransform',
  'animateMotion',
  'title',
  'desc',
].join(',');

const UNSUPPORTED_PRESENTATION_ATTRIBUTES = [
  'filter',
  'mask',
  'clip-path',
  'style',
] as const;

function inlineComputedStyles(sourceRoot: Element, clonedRoot: Element): void {
  const sourceElements = [
    sourceRoot,
    ...Array.from(sourceRoot.querySelectorAll('*')),
  ];
  const clonedElements = [
    clonedRoot,
    ...Array.from(clonedRoot.querySelectorAll('*')),
  ];

  sourceElements.forEach((sourceElement, index) => {
    const clonedElement = clonedElements[index];
    if (!clonedElement) {
      return;
    }

    const computedStyle = window.getComputedStyle(sourceElement);
    for (const property of INLINE_STYLE_PROPERTIES) {
      const value = computedStyle.getPropertyValue(property).trim();
      if (!value) {
        continue;
      }
      clonedElement.setAttribute(property, value);
    }
  });
}

function sanitizeSvgForCanvg(root: Element): void {
  for (const element of Array.from(
    root.querySelectorAll(UNSUPPORTED_EXPORT_SELECTOR),
  )) {
    element.remove();
  }

  for (const element of Array.from(root.querySelectorAll('*'))) {
    for (const attribute of UNSUPPORTED_PRESENTATION_ATTRIBUTES) {
      element.removeAttribute(attribute);
    }
  }
}

export async function captureWorkspaceThumbnail(
  workspace: Workspace,
): Promise<string | undefined> {
  const svgWorkspace = workspace as SvgWorkspace;
  if (!svgWorkspace.getCanvas) {
    return undefined;
  }
  const canvas = svgWorkspace.getCanvas();
  if (!canvas) {
    return undefined;
  }

  let bbox: DOMRect;
  try {
    bbox = canvas.getBBox();
  } catch {
    return undefined;
  }
  if (
    !Number.isFinite(bbox.width) ||
    !Number.isFinite(bbox.height) ||
    bbox.width <= 0 ||
    bbox.height <= 0
  ) {
    // 空 workspace：无积木可截
    return undefined;
  }

  const paddedX = bbox.x - THUMBNAIL_PADDING_PX;
  const paddedY = bbox.y - THUMBNAIL_PADDING_PX;
  const paddedWidth = bbox.width + THUMBNAIL_PADDING_PX * 2;
  const paddedHeight = bbox.height + THUMBNAIL_PADDING_PX * 2;
  const side = Math.max(paddedWidth, paddedHeight);
  const x = paddedX - (side - paddedWidth) / 2;
  const y = paddedY - (side - paddedHeight) / 2;

  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  svg.setAttribute('viewBox', `${x} ${y} ${side} ${side}`);

  const clonedCanvas = canvas.cloneNode(true) as SVGGElement;
  inlineComputedStyles(canvas, clonedCanvas);
  // 工作区 canvas 的 transform 是视口平移/缩放；导出封面要用 block 坐标系，否则可能截到空白区域。
  clonedCanvas.removeAttribute('transform');

  sanitizeSvgForCanvg(clonedCanvas);
  svg.appendChild(clonedCanvas);

  // 等字体就绪，避免 text 元素按未加载字体布局导致错位
  await document.fonts?.ready.catch(() => undefined);

  const targetWidth = THUMBNAIL_SIZE_PX;
  const targetHeight = THUMBNAIL_SIZE_PX;
  svg.setAttribute('width', String(targetWidth));
  svg.setAttribute('height', String(targetHeight));

  const canvasEl = document.createElement('canvas');
  canvasEl.width = targetWidth;
  canvasEl.height = targetHeight;
  const ctx = canvasEl.getContext('2d');
  if (!ctx) {
    return undefined;
  }

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, targetWidth, targetHeight);

  const serialized = new XMLSerializer().serializeToString(svg);

  let renderer: Canvg;
  try {
    renderer = Canvg.fromString(ctx, serialized, {
      ignoreAnimation: true,
      ignoreMouse: true,
    });
  } catch {
    return undefined;
  }

  try {
    await renderer.render({
      ignoreAnimation: true,
      ignoreMouse: true,
      ignoreClear: true,
    });
  } catch {
    return undefined;
  }

  return canvasEl.toDataURL('image/jpeg', JPEG_QUALITY);
}
