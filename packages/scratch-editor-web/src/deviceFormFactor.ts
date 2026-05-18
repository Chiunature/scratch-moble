/**
 * React Native 在 WebView 里通过 `injectedJavaScriptBeforeContentLoaded` 写入
 * `window.__RN_EDITOR_DEVICE__ = { formFactor: 'phone' | 'tablet' }`。
 * 浏览器直接打开 dist 时没有该字段，则用视口短边启发式兜底（与 RN 侧阈值尽量一致）。
 */
export type EditorFormFactor = 'phone' | 'tablet';

declare global {
  interface Window {
    __RN_EDITOR_DEVICE__?: {
      formFactor?: string;
    };
  }
}

/** 与 RN 侧判断平板用的阈值对齐（dp / 逻辑像素短边） */
const TABLET_MIN_SHORT_SIDE = 600;

function inferFormFactorFromViewport(): EditorFormFactor {
  const shortSide = Math.min(window.innerWidth, window.innerHeight);
  return shortSide >= TABLET_MIN_SHORT_SIDE ? 'tablet' : 'phone';
}

export function getEditorFormFactor(): EditorFormFactor {
  const raw = window.__RN_EDITOR_DEVICE__?.formFactor;
  if (raw === 'tablet' || raw === 'phone') {
    return raw;
  }
  return inferFormFactorFromViewport();
}
