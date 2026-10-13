import { parseEditorOutMessage } from '../src/features/editor/bridge/parseEditorMessage';

describe('parseEditorOutMessage', () => {
  it('解析合法 JSON 桥消息', () => {
    const raw = JSON.stringify({
      type: 'editor.code.generated',
      code: 'print(1)',
      blockCount: 3,
    });

    expect(parseEditorOutMessage(raw)).toEqual({
      type: 'editor.code.generated',
      code: 'print(1)',
      blockCount: 3,
    });
  });

  it('拒绝字段缺失或字段类型错误的助手消息', () => {
    expect(parseEditorOutMessage(JSON.stringify({ type: 'editor.workspace.snapshot', requestId: 'r', projectId: 'p' }))).toBeNull();
    expect(parseEditorOutMessage(JSON.stringify({ type: 'editor.workspace.candidate.ready', requestId: 'r', projectId: 'p', code: 42, blockCount: 0 }))).toBeNull();
    expect(parseEditorOutMessage(JSON.stringify({ type: 'editor.workspace.candidate.rejected', requestId: 'r', projectId: 'p', reason: {} }))).toBeNull();
  });

  it('非法 JSON 返回 null', () => {
    expect(parseEditorOutMessage('{not json')).toBeNull();
    expect(parseEditorOutMessage('')).toBeNull();
    expect(parseEditorOutMessage('plain text')).toBeNull();
  });

  it('JSON 标量/数组/未知 type 不进入桥协议', () => {
    expect(parseEditorOutMessage('42')).toBeNull();
    expect(parseEditorOutMessage('[]')).toBeNull();
    expect(parseEditorOutMessage('{"type":"debug.plainText"}')).toBeNull();
  });
});