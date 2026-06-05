/**
 * WebView 与 React Native 的编辑器桥接协议（跨端单一来源）。
 * mobile 与 scratch-editor-web 均从此模块导入，勿再维护副本。
 */
import type { HandleShankKey } from '../constants/handleShank';

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
      /** 1 = 单选，>1 = 多选（如 2） */
      maxSelections?: number;
    }
  | {
      type: 'editor.portPicker.close';
      sessionId: string;
    }
  | {
      type: 'editor.matrixLight.open';
      sessionId: string;
      /** 逗号分隔的 7 行 hex，与 field_matrix_light 存储格式一致 */
      rows: string;
    }
  | {
      type: 'editor.matrixLight.close';
      sessionId: string;
    }
  | {
      type: 'editor.notePicker.open';
      sessionId: string;
      /** 固件音高 pitch（0–36） */
      value: number;
    }
  | {
      type: 'editor.notePicker.close';
      sessionId: string;
    }
  | {
      type: 'editor.handleShank.open';
      sessionId: string;
      value: HandleShankKey;
    }
  | {
      type: 'editor.handleShank.close';
      sessionId: string;
    }
  | {
      type: 'editor.variablePrompt.open';
      sessionId: string;
      title: string;
      message: string;
      defaultValue: string;
      /** scratch-blocks variable type: '' for scalar, 'list' for lists. */
      varType?: string;
    }
  | {
      type: 'editor.variablePrompt.close';
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
    }
  | {
      /** 确认保存：一次注入完成写值并关会话 */
      type: 'editor.matrixLight.commit';
      sessionId: string;
      rows: string;
    }
  | {
      type: 'editor.matrixLight.close';
      sessionId: string;
    }
  | {
      /** 确认保存：一次注入完成写值并关会话（选键过程不桥接，仅 commit/close） */
      type: 'editor.notePicker.commit';
      sessionId: string;
      /** 固件音高 pitch（0–36） */
      value: number;
    }
  | {
      type: 'editor.notePicker.close';
      sessionId: string;
    }
  | {
      /** 确认保存：一次注入完成写值并关会话 */
      type: 'editor.handleShank.commit';
      sessionId: string;
      value: HandleShankKey;
    }
  | {
      type: 'editor.handleShank.close';
      sessionId: string;
    }
  | {
      type: 'editor.variablePrompt.commit';
      sessionId: string;
      name: string;
    }
  | {
      type: 'editor.variablePrompt.cancel';
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

export type RnMatrixLightOpenMessage = Extract<
  EditorOutMessage,
  { type: 'editor.matrixLight.open' }
>;

export type RnNotePickerOpenMessage = Extract<
  EditorOutMessage,
  { type: 'editor.notePicker.open' }
>;

export type RnHandleShankOpenMessage = Extract<
  EditorOutMessage,
  { type: 'editor.handleShank.open' }
>;

export type RnVariablePromptOpenMessage = Extract<
  EditorOutMessage,
  { type: 'editor.variablePrompt.open' }
>;
