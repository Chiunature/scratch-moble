import React, { useCallback, useRef, useState } from 'react';
import {
  Pressable,
  Image,
  View,
  Text,
  useWindowDimensions,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';

import { NumberSliderOverlay } from '../../editor/NumberSliderOverlay';
import type {
  EditorOutMessage,
  RnNumberSliderOpenMessage,
} from '../../editor/editorMessages';
import { injectEditorMessage } from '../../editor/injectEditorMessage';
import { EDITOR_BUNDLE_HTML } from '../../editor/editorBundleHtml';
import { styles } from './EditorScreen.styles';
import HomeIcon from '../../../assets/editorScreen/home.png';
import CodeViewIcon from '../../../assets/editorScreen/codeView.png';

/** 与 `scratch-editor-web` 的 `deviceFormFactor.ts` 中阈值一致 */
const TABLET_MIN_SHORT_SIDE = 600;

function parseEditorOutMessage(raw: string): EditorOutMessage | null {
  try {
    return JSON.parse(raw) as EditorOutMessage;
  } catch {
    return null;
  }
}

export function EditorScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const webViewRef = useRef<WebView>(null);
  const formFactor =
    Math.min(width, height) >= TABLET_MIN_SHORT_SIDE ? 'tablet' : 'phone';
  const [rnSliderSession, setRnSliderSession] =
    useState<RnNumberSliderOpenMessage | null>(null);
  const injectedBeforeContentLoaded = `window.__RN_EDITOR_DEVICE__=${JSON.stringify(
    { formFactor },
  )};true;`;
  const [generatedCode, setGeneratedCode] = useState('// 等待编辑器生成代码');
  const [blockCount, setBlockCount] = useState(0);
  const [isCodePanelOpen, setIsCodePanelOpen] = useState(false);

  const handleEditorMessage = useCallback((message: EditorOutMessage) => {
    switch (message.type) {
      case 'editor.code.generated':
        setGeneratedCode(message.code);
        setBlockCount(message.blockCount);
        return;
      case 'editor.numberSlider.open':
        setRnSliderSession(current =>
          current?.sessionId === message.sessionId ? current : message,
        );
        return;
      case 'editor.numberSlider.close':
        setRnSliderSession(current =>
          current?.sessionId === message.sessionId ? null : current,
        );
        return;
    }
  }, []);

  const handleMessage = useCallback((event: WebViewMessageEvent) => {
    const message = parseEditorOutMessage(event.nativeEvent.data);
    if (message) {
      handleEditorMessage(message);
      return;
    }

    // 兼容早期 editor 直接 post 代码字符串的调试路径。
    setGeneratedCode(event.nativeEvent.data);
    setBlockCount(0);
  }, [handleEditorMessage]);

  return (
    <View style={styles.root}>
      <View style={[styles.editorHeader, { paddingTop: insets.top }]}>
        <Pressable
          style={styles.headerPressable}
          onPress={() => navigation.goBack()}
          accessibilityRole="button"
          accessibilityLabel="返回"
        >
          <Image source={HomeIcon} style={styles.headerIcon} />
        </Pressable>
        <View style={styles.headerContent}>
          <Pressable
            style={styles.headerPressable}
            onPress={() => setIsCodePanelOpen(open => !open)}
            accessibilityRole="button"
            accessibilityLabel="代码示例"
          >
            <Image source={CodeViewIcon} style={styles.headerIcon} />
          </Pressable>
        </View>
      </View>
      <View style={styles.editorPanel}>
        <WebView
          ref={webViewRef}
          style={styles.webView}
          originWhitelist={['*']}
          source={{ html: EDITOR_BUNDLE_HTML }}
          injectedJavaScriptBeforeContentLoaded={injectedBeforeContentLoaded}
          onMessage={handleMessage}
          javaScriptEnabled
          domStorageEnabled
        />
        <NumberSliderOverlay
          session={rnSliderSession}
          onValueChange={(sessionId, value) => {
            injectEditorMessage(webViewRef.current, {
              type: 'editor.numberSlider.value',
              sessionId,
              value,
            });
          }}
          onClose={sessionId => {
            setRnSliderSession(null);
            injectEditorMessage(webViewRef.current, {
              type: 'editor.numberSlider.close',
              sessionId,
            });
          }}
        />
        {isCodePanelOpen && (
          <View style={styles.codePanel}>
            <Text style={styles.codeTitle}>RN 收到的生成代码</Text>
            <Text style={styles.meta}>积木数量：{blockCount}</Text>
            <Text style={styles.code}>{generatedCode}</Text>
          </View>
        )}
      </View>
    </View>
  );
}
