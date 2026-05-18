/**
 * React Native 在 WebView 里通过 `injectedJavaScriptBeforeContentLoaded` 写入
 * `window.__RN_EDITOR_DEVICE__ = { formFactor: 'phone' | 'tablet' }`。
 * 浏览器直接打开 dist 时没有该字段，则用视口短边启发式兜底（与 RN 侧阈值尽量一致）。
 */
export type EditorFormFactor = 'phone' | 'tablet';

declare global {
  //  添加一个可选属性到 window 对象上
  //   - ?: 表示这个属性可能存在也可能不存在
  //   - 类型是一个对象，包含可选的 formFactor 属性（字符串类型）
  interface Window {
    __RN_EDITOR_DEVICE__?: { formFactor?: string };
  }
}

/** 与 RN 侧判断平板用的阈值对齐（dp / 逻辑像素短边） */
const TABLET_MIN_SHORT_SIDE = 600;
/**
 * 通过视口尺寸推断设备类型
 * 取窗口宽度和高度的较小值，与阈值比较
 */
function inferFormFactorFromViewport(): EditorFormFactor {
  const shortSide = Math.min(window.innerWidth, window.innerHeight);
  return shortSide >= TABLET_MIN_SHORT_SIDE ? 'tablet' : 'phone';
}

/**
 * 根据react native 传入的设备类型参数，或者通过视口尺寸推断设备类型
 * 如果传入了设备类型参数，则直接返回
 * 如果没有传入设备类型参数，则通过视口尺寸推断设备类型
 * 如果视口尺寸小于阈值，则返回手机类型
 * 如果视口尺寸大于等于阈值，则返回平板类型
 */
export function getEditorFormFactor(): EditorFormFactor {
  const raw = window.__RN_EDITOR_DEVICE__?.formFactor;
  if (raw === 'tablet' || raw === 'phone') {
    return raw;
  }
  return inferFormFactorFromViewport();
}
