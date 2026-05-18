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
  const [isOpebCodePanel, setIsOpebCodePanel] = useState(false);

  const handleMessage = useCallback((event: WebViewMessageEvent) => {
    try {
      const message = JSON.parse(event.nativeEvent.data) as EditorOutMessage;

      if (message.type === 'editor.code.generated') {
        setGeneratedCode(message.code);
        setBlockCount(message.blockCount);
        return;
      }

      if (message.type === 'editor.numberSlider.open') {
        setRnSliderSession(current =>
          current?.sessionId === message.sessionId ? current : message,
        );
        return;
      }

      if (message.type === 'editor.numberSlider.close') {
        setRnSliderSession(current =>
          current?.sessionId === message.sessionId ? null : current,
        );
      }
    } catch {
      setGeneratedCode(event.nativeEvent.data);
      setBlockCount(0);
    }
  }, []);

  return (
    <View style={styles.root}>
      <View style={[styles.editorHeader, { paddingTop: insets.top }]}>
        <Pressable
          style={styles.headerPressable}
          onPress={() => navigation.goBack()}
          accessibilityRole="button"
          accessibilityLabel="返回"
        >
          <Image source={HomeIcon} style={{ width: 24, height: 24 }} />
        </Pressable>
        <View style={styles.headerContent}>
          <Pressable
            style={styles.headerPressable}
            onPress={() => setIsOpebCodePanel(open => !open)}
            accessibilityRole="button"
            accessibilityLabel="代码示例"
          >
            <Image source={CodeViewIcon} style={{ width: 24, height: 24 }} />
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
        {isOpebCodePanel && (
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
