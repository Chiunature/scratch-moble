/**
 * WebView 与 React Native 的编辑器桥接协议（跨端单一来源）。
 * mobile 与 scratch-editor-web 均从此模块导入，勿再维护副本。
 */
import type { HandleShankKey } from '../constants/handleShank';
import type { EditorAppLocale } from './editorLocale';

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
    }
  | {
      type: 'editor.workspace.ready';
    }
  | {
      type: 'editor.workspace.loaded';
      projectId: string;
    }
  | {
      type: 'editor.workspace.changed';
      projectId: string;
      workspace: unknown;
      blockCount: number;
      revision: number;
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
    }
  | {
      type: 'editor.workspace.load';
      projectId: string;
      workspace: unknown | null;
      revision: number;
    }
  | {
      type: 'editor.workspace.flush';
      projectId: string;
    }
  | {
      type: 'editor.locale.set';
      locale: EditorAppLocale;
    };

export type RnWorkspaceReadyMessage = Extract<
  EditorOutMessage,
  { type: 'editor.workspace.ready' }
>;

export type RnWorkspaceChangedMessage = Extract<
  EditorOutMessage,
  { type: 'editor.workspace.changed' }
>;

export type RnWorkspaceLoadedMessage = Extract<
  EditorOutMessage,
  { type: 'editor.workspace.loaded' }
>;

export type RnNumberSliderOpenMessage = Extract<
  EditorOutMessage,
  { type: 'editor.numberSlider.open' }
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

/** WebView 全局桥函数名：RN 注入调用入口，mobile 与 scratch-editor-web 必须一致。 */
export const EDITOR_RECEIVE_FROM_NATIVE_GLOBAL =
  '__scratchEditorReceiveFromNative';

/**
 * WebView → RN 协议外消息允许清单，由 `EditorOutMessage` 联合类型派生：
 * Record 键约束强制枚举全部消息类型（缺项或多余均编译错误），消除手工清单漂移。
 */
const EDITOR_OUT_MESSAGE_TYPE_FLAGS = {
  'editor.code.generated': true,
  'editor.numberSlider.open': true,
  'editor.numberSlider.close': true,
  'editor.matrixLight.open': true,
  'editor.matrixLight.close': true,
  'editor.notePicker.open': true,
  'editor.notePicker.close': true,
  'editor.handleShank.open': true,
  'editor.handleShank.close': true,
  'editor.variablePrompt.open': true,
  'editor.variablePrompt.close': true,
  'editor.workspace.ready': true,
  'editor.workspace.loaded': true,
  'editor.workspace.changed': true,
} satisfies Record<EditorOutMessage['type'], true>;

export const EDITOR_OUT_MESSAGE_TYPES = Object.keys(
  EDITOR_OUT_MESSAGE_TYPE_FLAGS,
) as EditorOutMessage['type'][];
