/**
 * RN 侧镜像的 WebView bridge 协议。
 * 修改字段时同步更新 packages/scratch-editor-web/src/bridge/messages.ts。
 */

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
      anchor: { x: number; y: number; width: number; height: number };
      colors: { primary: string; secondary: string };
    }
  | {
      type: 'editor.numberSlider.close';
      sessionId: string;
    }
  | {
      type: 'editor.portPicker.open';
      sessionId: string;
      value: string;
      anchor: { x: number; y: number; width: number; height: number };
      colors: { primary: string; secondary: string };
    }
  | {
      type: 'editor.portPicker.close';
      sessionId: string;
    };

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
