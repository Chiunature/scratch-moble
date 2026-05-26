/**
 * 7×5 矩阵灯行数据（show 积木 LED1~LED7）。
 *
 * 每行 hex 范围 0x00~0x1F，低 5 位为大端位图：
 * - bit0 → 第 1 列（最左）
 * - bit4 → 第 5 列（最右）
 * 例：0x1F = 全亮；0x10 = 仅最右列；0x01 = 仅最左列。
 */

export const MATRIX_LIGHT_ROW_COUNT = 7 as const;
export const MATRIX_LIGHT_COL_COUNT = 5 as const;

export type MatrixLightRows = readonly [
  string,
  string,
  string,
  string,
  string,
  string,
  string,
];

/** 默认：7 行全亮（每行 0x1F） */
export const DEFAULT_MATRIX_LIGHT_ROWS: MatrixLightRows = [
  '1F',
  '1F',
  '1F',
  '1F',
  '1F',
  '1F',
  '1F',
];

export type MatrixLightCell = {
  on: boolean;
};

const ROW_DELIMITER = ',';

function normalizeRowHex(raw: string): string {
  const trimmed = raw.trim().replace(/^0x/i, '');
  if (!trimmed) {
    return '00';
  }
  const parsed = Number.parseInt(trimmed, 16);
  if (Number.isNaN(parsed)) {
    return '00';
  }
  const masked = parsed & 0x1f;
  return masked.toString(16).toUpperCase().padStart(2, '0');
}

export function coerceMatrixLightRows(input: unknown): MatrixLightRows {
  if (Array.isArray(input)) {
    const parts = input.map(item => normalizeRowHex(String(item ?? '')));
    while (parts.length < MATRIX_LIGHT_ROW_COUNT) {
      parts.push('00');
    }
    return parts.slice(0, MATRIX_LIGHT_ROW_COUNT) as unknown as MatrixLightRows;
  }

  if (typeof input === 'string') {
    const parts = input.split(ROW_DELIMITER).map(part => normalizeRowHex(part));
    while (parts.length < MATRIX_LIGHT_ROW_COUNT) {
      parts.push('00');
    }
    return parts.slice(0, MATRIX_LIGHT_ROW_COUNT) as unknown as MatrixLightRows;
  }

  return [...DEFAULT_MATRIX_LIGHT_ROWS];
}

export function serializeMatrixLightRows(
  rows: readonly string[] | string,
): string {
  return coerceMatrixLightRows(rows).join(ROW_DELIMITER);
}

export function parseMatrixLightRows(serialized: string): MatrixLightRows {
  return coerceMatrixLightRows(serialized);
}

/** 解析单行：col 0 = 最左列 = bit0，col 4 = 最右列 = bit4 */
export function parseMatrixLightRowBits(rowHex: string): MatrixLightCell[] {
  const parsed = Number.parseInt(normalizeRowHex(rowHex), 16);
  const value = Number.isNaN(parsed) ? 0 : parsed & 0x1f;

  return Array.from({ length: MATRIX_LIGHT_COL_COUNT }, (_, col) => ({
    on: ((value >> col) & 1) === 1,
  }));
}

export function parseMatrixLightGrid(serialized: string): MatrixLightCell[][] {
  const rows = parseMatrixLightRows(serialized);
  return Array.from({ length: MATRIX_LIGHT_ROW_COUNT }, (_, rowIndex) =>
    parseMatrixLightRowBits(rows[rowIndex] ?? '00'),
  );
}

export function matrixLightRowsFromGrid(
  grid: readonly (readonly boolean[])[],
): MatrixLightRows {
  const rows = Array.from({ length: MATRIX_LIGHT_ROW_COUNT }, (_, rowIndex) => {
    const sourceRow = grid[rowIndex] ?? [];
    let value = 0;
    for (let col = 0; col < MATRIX_LIGHT_COL_COUNT; col += 1) {
      if (sourceRow[col]) {
        value |= 1 << col;
      }
    }
    return normalizeRowHex(value.toString(16));
  });

  return rows as unknown as MatrixLightRows;
}

/** 生成 Python  positional 参数：0x1F, 0x10, 0x00, ... */
export function matrixLightRowsToPythonArgs(serialized: string): string {
  const rows = parseMatrixLightRows(serialized);
  return rows.map(row => `0x${row}`).join(', ');
}
