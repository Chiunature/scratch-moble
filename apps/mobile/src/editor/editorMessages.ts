/** 与 scratch-editor-web/src/bridge/messages.ts 保持字段一致 */

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
    };

export type RnNumberSliderOpenMessage = Extract<
  EditorOutMessage,
  { type: 'editor.numberSlider.open' }
>;
