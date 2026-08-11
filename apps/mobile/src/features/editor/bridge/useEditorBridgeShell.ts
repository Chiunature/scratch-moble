import { useCallback, useEffect, useMemo, useState } from 'react';
import type { RefObject } from 'react';
import type { WebView } from 'react-native-webview';

import { getCurrentAppLocale, useTranslation } from '@scratch-mobile/i18n';
import { EDITOR_EMBEDDED_LOCALE_GLOBAL } from '@scratch-mobile/shared';

import { loadEditorBundleHtml } from '../loadEditorBundleHtml';
import { injectEditorLocale } from '../injectEditorLocale';
import { editorMessageDeduper } from './injectEditorMessage';

type ShellOptions = {
  webViewRef: RefObject<WebView | null>;
};

/**
 * 编辑器 WebView 外壳：bundle 加载 + locale 收敛 + 重载清空去重。
 * locale 三机制：首帧脚本（embeddedLocaleScript）、workspace.ready 兜底（由
 * SessionManager 在消息路由中触发）、languageChanged 实时同步（本 hook 监听）。
 */
export function useEditorBridgeShell({ webViewRef }: ShellOptions) {
  const { t, i18n } = useTranslation('editorShell');

  const [editorHtml, setEditorHtml] = useState<string | null>(null);
  const [editorHtmlError, setEditorHtmlError] = useState<string | null>(null);

  /** WebView 重载后清空注入去重状态，避免上一生命周期残留 payload 拦截首条消息 */
  const handleWebViewLoadEnd = useCallback(() => {
    editorMessageDeduper.clear();
  }, []);

  // bootstrap 首帧前写入 App 语言，避免 WebView 用 navigator 语言渲染飞栏后再闪一下。
  const currentAppLocale = getCurrentAppLocale();
  const editorEmbeddedLocaleScript = useMemo(
    () =>
      `window.${EDITOR_EMBEDDED_LOCALE_GLOBAL}=${JSON.stringify(
        currentAppLocale,
      )};true;`,
    [currentAppLocale],
  );

  useEffect(() => {
    let cancelled = false;
    void loadEditorBundleHtml()
      .then(html => {
        if (!cancelled) {
          setEditorHtml(html);
          setEditorHtmlError(null);
        }
      })
      .catch(error => {
        if (!cancelled) {
          setEditorHtmlError(
            error instanceof Error ? error.message : String(error),
          );
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const syncEditorLocale = () => {
      injectEditorLocale(webViewRef.current);
    };
    i18n.on('languageChanged', syncEditorLocale);
    return () => {
      i18n.off('languageChanged', syncEditorLocale);
    };
  }, [i18n, webViewRef]);

  return {
    /** 加载占位文案，随语言切换更新，供 SessionManager 初始化 generatedCode */
    codePlaceholder: t('loading.codePlaceholder'),
    editorHtml,
    editorHtmlError,
    editorEmbeddedLocaleScript,
    handleWebViewLoadEnd,
  };
}