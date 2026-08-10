import type { EditorOutMessage } from '@scratch-mobile/shared';

const EDITOR_OUT_MESSAGE_TYPES = new Set<EditorOutMessage['type']>([
  'editor.code.generated',
  'editor.numberSlider.open',
  'editor.numberSlider.close',
  'editor.matrixLight.open',
  'editor.matrixLight.close',
  'editor.notePicker.open',
  'editor.notePicker.close',
  'editor.handleShank.open',
  'editor.handleShank.close',
  'editor.variablePrompt.open',
  'editor.variablePrompt.close',
  'editor.workspace.ready',
  'editor.workspace.loaded',
  'editor.workspace.changed',
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * 解析 WebView → RN 桥消息。协议外载荷返回 null 并丢弃，
 * 避免绕过 `EditorOutMessage` 协议直接进入编辑器状态。
 */
export function parseEditorOutMessage(raw: string): EditorOutMessage | null {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!isRecord(parsed) || typeof parsed.type !== 'string') {
      return null;
    }
    if (!EDITOR_OUT_MESSAGE_TYPES.has(parsed.type as EditorOutMessage['type'])) {
      return null;
    }
    return parsed as EditorOutMessage;
  } catch {
    return null;
  }
}