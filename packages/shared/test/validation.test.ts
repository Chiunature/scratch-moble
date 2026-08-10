import { createSchemaReader, isSchemaRecord } from '../src';

describe('schema validation helpers', () => {
  const schema = createSchemaReader(message => new TypeError(message));

  it('识别普通对象，拒绝 null 和数组', () => {
    expect(isSchemaRecord({ a: 1 })).toBe(true);
    expect(isSchemaRecord(null)).toBe(false);
    expect(isSchemaRecord([])).toBe(false);
  });

  it('按统一错误工厂读取必填字段', () => {
    const record = schema.record(
      { name: 'demo', version: 1, scale: 1.5, point: [1, 2, 3] },
      'must be object',
    );

    expect(schema.nonEmptyString(record, 'name', 'bad name')).toBe('demo');
    expect(schema.integer(record, 'version', 'bad version')).toBe(1);
    expect(schema.positiveNumber(record, 'scale', 'bad scale')).toBe(1.5);
    expect(schema.tuple3(record, 'point', 'bad point')).toEqual([1, 2, 3]);
    expect(() => schema.nonEmptyString(record, 'missing', 'bad name')).toThrow(
      TypeError,
    );
  });

  it('oneOf 保留字面量 union 语义', () => {
    expect(schema.oneOf('preview', ['instruction', 'preview'] as const, 'bad')).toBe(
      'preview',
    );
    expect(() => schema.oneOf('unknown', ['instruction', 'preview'] as const, 'bad')).toThrow(
      'bad',
    );
  });
});