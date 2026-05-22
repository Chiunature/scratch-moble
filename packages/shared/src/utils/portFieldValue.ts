/** 端口字段存盘/桥接：单选 "3"，多选 "1,2"（逗号分隔、升序）；显示 "1+2"。 */

export type PortSelectionMode = 'single' | 'multi';

const DEFAULT_PORT = '0';

export type PortFieldCoerceOptions = {
  mode: PortSelectionMode;
  maxSelections?: number;
};

/** 从字段原始 string 解析端口列表。 */
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

/** 去重、按端口编号升序，多选截断到 maxSelections。 */
export function normalizePortValues(
  values: string[],
  maxSelections: number,
): string[] {
  const max = Math.max(1, maxSelections);
  const seen = new Set<string>();
  const unique: string[] = [];
  for (const v of values) {
    const s = String(v).trim();
    if (!s || seen.has(s)) {
      continue;
    }
    seen.add(s);
    unique.push(s);
  }
  unique.sort((a, b) => Number(a) - Number(b));
  if (unique.length === 0) {
    return [DEFAULT_PORT];
  }
  if (max === 1) {
    return [unique[0]!];
  }
  return unique.slice(0, max);
}

/** 写入字段 / 回传 Web 的字符串。 */
export function formatPortFieldValue(
  ports: string[],
  mode: PortSelectionMode,
  maxSelections = 2,
): string {
  const max = mode === 'multi' ? maxSelections : 1;
  const normalized = normalizePortValues(ports, max);
  if (mode === 'single') {
    return normalized[0]!;
  }
  return normalized.join(',');
}

/** parse → normalize → format 一步完成。 */
export function coercePortFieldValue(
  raw: string,
  opts: PortFieldCoerceOptions,
): string {
  const max = opts.mode === 'multi' ? (opts.maxSelections ?? 2) : 1;
  const ports = normalizePortValues(parsePortFieldValue(raw), max);
  return formatPortFieldValue(ports, opts.mode, opts.maxSelections ?? 2);
}

/** 由 maxSelections 推导模式（桥接/RN 用）。 */
export function portModeFromMaxSelections(maxSelections: number): PortSelectionMode {
  return maxSelections > 1 ? 'multi' : 'single';
}

/** 积木上显示的端口文案（多选为 1+2，存盘仍为 1,2）。 */
export function formatPortFieldDisplay(raw: string): string {
  const ports = parsePortFieldValue(raw);
  if (ports.length === 1) {
    return ports[0]!;
  }
  return ports.join('+');
}
