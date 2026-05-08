/**
 * scratch-blocks 的缩放按钮默认从 pathToMedia 拉远程 SVG；RN WebView 内嵌 html 时常失败。
 * 注入后改为使用 assets/zoom 下的图标（esbuild dataurl）。要换图标只需替换三个 SVG 并重新 build。
 *
 * 部分 WebView 上 SVG <image> 不满足 instanceof SVGImageElement，因此不用该判断。
 * 若 inject 未挂上缩放条（zoomControls_ 异常等），会兜底 new ScratchZoomControls。
 */
import { ScratchZoomControls } from 'scratch-blocks';

import type { Workspace } from '../codegen/types';
import zoomInImport from '../../assets/zoom/zoom-in.svg';
import zoomOutImport from '../../assets/zoom/zoom-out.svg';
import zoomResetImport from '../../assets/zoom/zoom-reset.svg';

const zoomInUrl = zoomInImport as unknown as string;
const zoomOutUrl = zoomOutImport as unknown as string;
const zoomResetUrl = zoomResetImport as unknown as string;

const XLINK_NS = 'http://www.w3.org/1999/xlink';

function setSvgImageHref(el: Element, href: string): void {
  const tag = el.tagName.toLowerCase();
  // 只处理 <image> 标签
  if (tag !== 'image') {
    return;
  }
  // 新版 SVG 标准使用 href
  el.setAttribute('href', href);
  // 旧版 SVG 标准使用 xlink:href（向后兼容）
  el.setAttributeNS(XLINK_NS, 'xlink:href', href);
}

function patchImagesInGroup(
  root: ParentNode,
  groupClass: string,
  href: string,
): void {
  // 查找对应的分组元素
  const group = root.querySelector(groupClass);
  if (!group) {
    return;
  }
  // 在分组内查找 <image> 标签
  const img = group.querySelector('image');
  if (img) {
    // 替换图片地址
    setSvgImageHref(img, href);
  }
}

/** scratch inject 里若未替换成功，工作区可能没有 .blocklyZoom*，此处补挂一套。 */
export function ensureScratchZoomControlsIfMissing(workspace: Workspace): void {
  if (!workspace.options.zoomOptions?.controls) {
    return;
  }
  const svgGroup = workspace.getSvgGroup?.();
  if (!svgGroup || svgGroup.querySelector('.blocklyZoom')) {
    return;
  }
  const z = new ScratchZoomControls(workspace);
  svgGroup.appendChild(z.createDom());
  z.init();
}

export function patchScratchZoomControlImages(workspace: Workspace): void {
  const root = workspace.getInjectionDiv?.();
  if (!root) {
    return;
  }

  patchImagesInGroup(root, '.blocklyZoomIn', zoomInUrl);
  patchImagesInGroup(root, '.blocklyZoomOut', zoomOutUrl);
  patchImagesInGroup(root, '.blocklyZoomReset', zoomResetUrl);
}
