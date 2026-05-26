import React, { useCallback, useRef, useState } from 'react';
import { Pressable, Image, View, Text } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';

import type {
  EditorOutMessage,
  RnNumberSliderOpenMessage,
  RnPortPickerOpenMessage,
  RnMatrixLightOpenMessage,
} from '@scratch-mobile/shared';
import {
  EDITOR_BUNDLE_HTML,
  injectEditorMessage,
  MatrixLightOverlay,
  NumberSliderOverlay,
  PortPickerOverlay,
  resetInjectEditorMessageDedup,
} from '../../features/editor';
import { styles } from './EditorScreen.styles';
import HomeIcon from '../../../assets/editorScreen/home.png';
import CodeViewIcon from '../../../assets/editorScreen/codeView.png';

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
  const webViewRef = useRef<WebView>(null);
  //存储当前激活的数字滑块会话
  const [rnSliderSession, setRnSliderSession] =
    useState<RnNumberSliderOpenMessage | null>(null);
  const [rnPortPickerSession, setRnPortPickerSession] =
    useState<RnPortPickerOpenMessage | null>(null);
  const [rnMatrixLightSession, setRnMatrixLightSession] =
    useState<RnMatrixLightOpenMessage | null>(null);
  //存储生成的代码
  const [generatedCode, setGeneratedCode] = useState('// 等待编辑器生成代码');
  //存储积木数量
  const [blockCount, setBlockCount] = useState(0);
  //存储代码面板是否打开
  const [isCodePanelOpen, setIsCodePanelOpen] = useState(false);
  const lastCodeRef = useRef({ code: '', blockCount: 0 });

  //处理WebView发送的消息
  const handleEditorMessage = useCallback((message: EditorOutMessage) => {
    switch (message.type) {
      case 'editor.code.generated': {
        const { code: nextCode, blockCount: nextBlockCount } = message;
        if (
          lastCodeRef.current.code === nextCode &&
          lastCodeRef.current.blockCount === nextBlockCount
        ) {
          return;
        }
        lastCodeRef.current = { code: nextCode, blockCount: nextBlockCount };
        setGeneratedCode(nextCode);
        setBlockCount(nextBlockCount);
        return;
      }
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
      case 'editor.portPicker.open':
        setRnPortPickerSession(current =>
          current?.sessionId === message.sessionId ? current : message,
        );
        return;
      case 'editor.portPicker.close':
        setRnPortPickerSession(current =>
          current?.sessionId === message.sessionId ? null : current,
        );
        return;
      case 'editor.matrixLight.open':
        setRnMatrixLightSession(current => {
          if (
            current?.sessionId === message.sessionId &&
            current.rows === message.rows
          ) {
            return current;
          }
          return message;
        });
        return;
      case 'editor.matrixLight.close':
        setRnMatrixLightSession(current =>
          current?.sessionId === message.sessionId ? null : current,
        );
        return;
    }
  }, []);

  const handleMessage = useCallback(
    (event: WebViewMessageEvent) => {
      const message = parseEditorOutMessage(event.nativeEvent.data);
      if (message) {
        handleEditorMessage(message);
        return;
      }

      // 兼容早期 editor 直接 post 代码字符串的调试路径。
      setGeneratedCode(event.nativeEvent.data);
      setBlockCount(0);
    },
    [handleEditorMessage],
  );

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
          originWhitelist={['*']}
          source={{ html: EDITOR_BUNDLE_HTML }} //加载编辑器网页
          onMessage={handleMessage} //处理WebView发送的消息
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
            resetInjectEditorMessageDedup();
            injectEditorMessage(webViewRef.current, {
              type: 'editor.numberSlider.close',
              sessionId,
            });
          }}
        />
        <PortPickerOverlay
          session={rnPortPickerSession}
          onValueChange={(sessionId, value) => {
            injectEditorMessage(webViewRef.current, {
              type: 'editor.portPicker.value',
              sessionId,
              value,
            });
          }}
          onClose={sessionId => {
            setRnPortPickerSession(null);
            resetInjectEditorMessageDedup();
            injectEditorMessage(webViewRef.current, {
              type: 'editor.portPicker.close',
              sessionId,
            });
          }}
        />
        <MatrixLightOverlay
          session={rnMatrixLightSession}
          onCommit={(sessionId, rows) => {
            setRnMatrixLightSession(null);
            resetInjectEditorMessageDedup();
            injectEditorMessage(webViewRef.current, {
              type: 'editor.matrixLight.commit',
              sessionId,
              rows,
            });
          }}
          onClose={sessionId => {
            setRnMatrixLightSession(null);
            resetInjectEditorMessageDedup();
            injectEditorMessage(webViewRef.current, {
              type: 'editor.matrixLight.close',
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
