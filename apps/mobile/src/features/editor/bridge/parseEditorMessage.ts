import {
  EDITOR_OUT_MESSAGE_TYPES,
  type EditorOutMessage,
} from '@scratch-mobile/shared';

const EDITOR_OUT_MESSAGE_TYPE_SET = new Set<EditorOutMessage['type']>(
  EDITOR_OUT_MESSAGE_TYPES,
);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isAssistantPayload(value: Record<string, unknown>): boolean {
  const text = (key: string) => typeof value[key] === 'string';
  const count = (key: string) =>
    typeof value[key] === 'number' &&
    Number.isInteger(value[key]) &&
    (value[key] as number) >= 0;
  if (!text('requestId') || !text('projectId')) return false;
  if (value.type === 'editor.workspace.candidate.rejected')
    return text('reason');
  if (!text('code') || !count('blockCount')) return false;
  if (value.type === 'editor.workspace.candidate.applied')
    return text('workspaceHash');
  if (!text('sessionId') || !isRecord(value.workspace)) return false;
  if (value.type === 'editor.workspace.candidate.ready') {
    return (
      text('candidateId') &&
      text('baseWorkspaceHash') &&
      text('candidateWorkspaceHash')
    );
  }
  return (
    text('catalogVersion') &&
    text('workspaceHash') &&
    count('revision') &&
    Array.isArray(value.blocks) &&
    value.blocks.length <= 500 &&
    value.blocks.every(
      block =>
        isRecord(block) &&
        typeof block.id === 'string' &&
        typeof block.type === 'string' &&
        typeof block.role === 'string' &&
        isRecord(block.fields) &&
        Array.isArray(block.inputNames),
    )
  );
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
    if (
      !EDITOR_OUT_MESSAGE_TYPE_SET.has(parsed.type as EditorOutMessage['type'])
    ) {
      return null;
    }
    if (
      (parsed.type === 'editor.workspace.snapshot' ||
        parsed.type.startsWith('editor.workspace.candidate.')) &&
      !isAssistantPayload(parsed)
    ) {
      return null;
    }
    return parsed as EditorOutMessage;
  } catch {
    return null;
  }
}
