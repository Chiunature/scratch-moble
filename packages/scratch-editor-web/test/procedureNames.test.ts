import {
  buildProcedureNameRegistry,
  procCodeToPythonBase,
  procedureParamNamesFromProcCode,
  procedureParamNamesFromProto,
} from '../src/codegen/procedureNames';
import type { ScratchBlock } from '../src/codegen/types';

function mockProtoBlock(
  procCode: string,
  displayNames?: string[],
): ScratchBlock {
  return {
    type: 'procedures_prototype',
    getProcCode: () => procCode,
    ...(displayNames ? { displayNames_: displayNames } : {}),
    getInputTargetBlock: () => null,
    getFieldValue: () => null,
  } as unknown as ScratchBlock;
}

function mockDefinitionBlock(proto: ScratchBlock): ScratchBlock {
  return {
    type: 'procedures_definition',
    getInputTargetBlock: (name: string) =>
      name === 'custom_block' ? proto : null,
  } as unknown as ScratchBlock;
}

describe('procCodeToPythonBase', () => {
  test('uses the label before parameter placeholders', () => {
    expect(procCodeToPythonBase('move %n steps')).toBe('move');
  });

  test('converts Chinese labels to pinyin', () => {
    expect(procCodeToPythonBase('前进')).toBe('qianjin');
  });
});

describe('procedureParamNamesFromProcCode', () => {
  test('assigns typed fallback names in procCode order', () => {
    expect(procedureParamNamesFromProcCode('say %s for %n secs %b')).toEqual([
      'string0',
      'number1',
      'boolean2',
    ]);
  });
});

describe('procedureParamNamesFromProto', () => {
  test('prefers user display names over fallback names', () => {
    const proto = mockProtoBlock('move %n steps', ['步数']);
    expect(procedureParamNamesFromProto(proto as never)).toEqual(['bushu']);
  });

  test('deduplicates colliding parameter names', () => {
    const proto = mockProtoBlock('test %n %n', ['步数', '步数']);
    expect(procedureParamNamesFromProto(proto as never)).toEqual([
      'bushu',
      'bushu01',
    ]);
  });
});

describe('buildProcedureNameRegistry', () => {
  test('deduplicates colliding procedure names with numeric suffixes', () => {
    const first = mockDefinitionBlock(mockProtoBlock('前进'));
    const second = mockDefinitionBlock(mockProtoBlock('前进 %n'));

    const registry = buildProcedureNameRegistry([first, second]);

    expect(registry.get('前进')).toBe('qianjin01');
    expect(registry.get('前进 %n')).toBe('qianjin02');
  });
});
