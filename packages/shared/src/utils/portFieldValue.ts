const DEFAULT_PORT = '0';

/** 从字段原始 string 解析端口列表；兼容旧双端口存盘值 "0,1"。 */
export function parsePortFieldValue(raw: string): string[] {
  const trimmed = raw.trim();
  if (!trimmed) {
    return [DEFAULT_PORT];
  }
  if (!trimmed.includes(',')) {
    return [trimmed];
  }
  const ports = trimmed
    .split(',')
    .map(v => v.trim())
    .filter(v => v.length > 0);
  return ports.length > 0 ? ports : [DEFAULT_PORT];
}
