import React, { useState } from 'react';
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
import { EDITOR_BUNDLE_HTML } from '../../editor/editorBundleHtml';
import { styles } from './EditorScreen.styles';
import HomeIcon from '../../../assets/editorScreen/home.png';
import CodeViewIcon from '../../../assets/editorScreen/codeView.png';

type EditorMessage = {
  type: 'editor.code.generated';
  code: string;
  blockCount: number;
};

/** 与 `scratch-editor-web` 的 `deviceFormFactor.ts` 中阈值一致 */
const TABLET_MIN_SHORT_SIDE = 600;

export function EditorScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets(); // 用于获取被安全区域遮挡的尺寸
  const { width, height } = useWindowDimensions(); //获取当前窗口的宽高
  const formFactor =
    Math.min(width, height) >= TABLET_MIN_SHORT_SIDE ? 'tablet' : 'phone';
  const injectedBeforeContentLoaded = `window.__RN_EDITOR_DEVICE__=${JSON.stringify(
    { formFactor },
  )};true;`;
  const [generatedCode, setGeneratedCode] = useState('// 等待编辑器生成代码');
  const [blockCount, setBlockCount] = useState(0);
  const [isOpebCodePanel, setIsOpebCodePanel] = useState(false);
  const toggleCodePanel = () => {
    console.log('设置前toggleCodePanel', isOpebCodePanel);
    setIsOpebCodePanel(!isOpebCodePanel);
    console.log('设置完toggleCodePanel', isOpebCodePanel);
  };

  function handleMessage(event: WebViewMessageEvent) {
    try {
      const message = JSON.parse(event.nativeEvent.data) as EditorMessage;

      if (message.type === 'editor.code.generated') {
        setGeneratedCode(message.code);
        setBlockCount(message.blockCount);
      }
    } catch {
      setGeneratedCode(event.nativeEvent.data);
      setBlockCount(0);
    }
  }

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
            onPress={() => {
              toggleCodePanel();
            }}
            accessibilityRole="button"
            accessibilityLabel="代码示例"
          >
            <Image source={CodeViewIcon} style={{ width: 24, height: 24 }} />
          </Pressable>
        </View>
      </View>
      <View style={styles.editorPanel}>
        <WebView
          originWhitelist={['*']}
          source={{ html: EDITOR_BUNDLE_HTML }}
          injectedJavaScriptBeforeContentLoaded={injectedBeforeContentLoaded}
          onMessage={handleMessage}
          javaScriptEnabled
          domStorageEnabled
        />
        {isOpebCodePanel && (
          <View style={[styles.codePanel]}>
            <Text style={styles.codeTitle}>RN 收到的生成代码</Text>
            <Text style={styles.meta}>积木数量：{blockCount}</Text>
            <Text style={styles.code}>{generatedCode}</Text>
          </View>
        )}
      </View>
    </View>
  );
}
