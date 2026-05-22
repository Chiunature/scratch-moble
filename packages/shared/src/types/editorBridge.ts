/**
 * WebView 与 React Native 的编辑器桥接协议（跨端单一来源）。
 * mobile 与 scratch-editor-web 均从此模块导入，勿再维护副本。
 */

/** WebView → React Native */
export type EditorOutMessage =
  | {
      type: 'editor.code.generated';
      code: string;
      blockCount: number;
    }
  | {
      type: 'editor.numberSlider.open';
      sessionId: string;
      min: number;
      max: number;
      step: number;
      value: number;
    }
  | {
      type: 'editor.numberSlider.close';
      sessionId: string;
    }
  | {
      type: 'editor.portPicker.open';
      sessionId: string;
      value: string;
    }
  | {
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

export type RnNumberSliderOpenMessage = Extract<
  EditorOutMessage,
  { type: 'editor.numberSlider.open' }
>;

export type RnPortPickerOpenMessage = Extract<
  EditorOutMessage,
  { type: 'editor.portPicker.open' }
>;
