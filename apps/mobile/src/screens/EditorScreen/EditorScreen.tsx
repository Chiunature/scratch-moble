import React, { useState } from 'react';
import { Text, View } from 'react-native';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';

import { EDITOR_SHELL_HTML } from '../../editor/editorShellHtml';
import { styles } from './EditorScreen.styles';

type EditorMessage = {
  type: 'editor.code.generated';
  code: string;
  blockCount: number;
};

export function EditorScreen() {
  const [generatedCode, setGeneratedCode] = useState('// 等待编辑器生成代码');
  const [blockCount, setBlockCount] = useState(0);

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
    <View style={styles.container}>
      <View style={styles.editorPanel}>
        <WebView
          originWhitelist={['*']}
          source={{ html: EDITOR_SHELL_HTML }}
          onMessage={handleMessage}
          javaScriptEnabled
          domStorageEnabled
        />
      </View>
      <View style={styles.codePanel}>
        <Text style={styles.codeTitle}>RN 收到的生成代码</Text>
        <Text style={styles.meta}>积木数量：{blockCount}</Text>
        <Text style={styles.code}>{generatedCode}</Text>
      </View>
    </View>
  );
}
