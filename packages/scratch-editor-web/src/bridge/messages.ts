/**
 * WebView 与 React Native 的桥接协议（Web 侧源定义）。
 * 修改字段时同步更新 apps/mobile/src/editor/editorMessages.ts。
 */

/** WebView → React Native */
export type EditorOutMessage =
  | {
      //代码
      type: 'editor.code.generated';
      code: string;
      blockCount: number;
    }
  | {
      //数字滑块开启
      type: 'editor.numberSlider.open';
      sessionId: string;
      min: number;
      max: number;
      step: number;
      value: number;
    }
  | {
      //数字滑块关闭
      type: 'editor.numberSlider.close';
      sessionId: string;
    }
  | {
      //端口选择器开启（选项与配色由 RN 定义，Web 只传当前值）
      type: 'editor.portPicker.open';
      sessionId: string;
      value: string;
    }
  | {
      //端口选择器关闭
      type: 'editor.portPicker.close';
      sessionId: string;
    };

/** React Native → WebView（injectJavaScript） */
export type EditorInMessage =
  | {
      type: 'editor.numberSlider.value';
      sessionId: string;
      value: number;
    }
  | {
      type: 'editor.numberSlider.close';
      sessionId: string;
    }
  | {
      type: 'editor.portPicker.value';
      sessionId: string;
      value: string;
    }
  | {
      type: 'editor.portPicker.close';
      sessionId: string;
    };
