import type { RefObject } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import {
  WebView,
  type WebViewMessageEvent,
} from 'react-native-webview';
import { useTranslation } from '@scratch-mobile/i18n';

import { colors, fontSize, fontWeight, spacing } from '../../../theme';

type Props = {
  webViewRef: RefObject<WebView | null>;
  html: string | null;
  htmlError: string | null;
  embeddedLocaleScript: string;
  onMessage: (event: WebViewMessageEvent) => void;
  /** WebView 加载完成（含重载）后回调，用于清空注入去重状态 */
  onLoadEnd?: () => void;
};

/** 封装编辑器 WebView：加载 bundle、注入首帧语言脚本、转发 onMessage；未就绪时渲染 loading/错误覆盖层 */
export function EditorBridgeView({
  webViewRef,
  html,
  htmlError,
  embeddedLocaleScript,
  onMessage,
  onLoadEnd,
}: Props) {
  const { t } = useTranslation('editorShell');

  if (htmlError) {
    return (
      <View style={styles.overlay} pointerEvents="auto">
        <Text style={styles.text}>{htmlError}</Text>
      </View>
    );
  }

  if (html == null) {
    return (
      <View style={styles.overlay} pointerEvents="auto">
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.text}>{t('loading.project')}</Text>
      </View>
    );
  }

  return (
    <WebView
      ref={webViewRef}
      originWhitelist={['*']}
      source={{ html }}
      injectedJavaScriptBeforeContentLoaded={embeddedLocaleScript}
      onMessage={onMessage}
      onLoadEnd={onLoadEnd}
      javaScriptEnabled
      domStorageEnabled
    />
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.72)',
    gap: spacing.sm,
  },
  text: {
    color: colors.textSubtle,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
  },
});