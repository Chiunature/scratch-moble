/** 反编译回环对不上时只报第一条差异，避免把两份全文塞进修复请求。 */
export function firstPythonMismatchMessage(
  originalNormalized: string,
  regeneratedNormalized: string,
): string {
  const originalLines = originalNormalized.split('\n').filter(Boolean);
  const regeneratedLines = regeneratedNormalized.split('\n').filter(Boolean);
  const limit = Math.max(originalLines.length, regeneratedLines.length);
  for (let index = 0; index < limit; index += 1) {
    const expected = originalLines[index];
    const actual = regeneratedLines[index];
    if (expected === actual) continue;
    return [
      '反编译结果与原 Python 不一致。',
      `原程序第 ${index + 1} 行：${expected ?? '(无)'}`,
      `生成结果第 ${index + 1} 行：${actual ?? '(无)'}`,
    ].join('\n');
  }
  return '反编译结果与原 Python 不一致。';
}
