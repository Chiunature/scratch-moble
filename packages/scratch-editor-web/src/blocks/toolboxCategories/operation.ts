import { buildToolboxCategory } from './buildCategory';
import { numberKeyboardShadow, stringShadow } from './shadowPresets';

const numShadow = (n: number) => ({ shadow: numberKeyboardShadow(n) });
const strShadow = (text: string) => ({ shadow: stringShadow(text) });

/** scratch-blocks 内置 operator_* 积木（见 node_modules/scratch-blocks/src/blocks/operators.ts） */
export function operationToolboxCategory() {
  return buildToolboxCategory({
    id: 'operation',
    categorystyle: 'operation_category',
    contents: [
    { kind: 'label', text: '数字' },
    {
      kind: 'block',
      type: 'operator_add',
      inputs: { NUM1: numShadow(0), NUM2: numShadow(0) },
    },
    {
      kind: 'block',
      type: 'operator_subtract',
      inputs: { NUM1: numShadow(0), NUM2: numShadow(0) },
    },
    {
      kind: 'block',
      type: 'operator_multiply',
      inputs: { NUM1: numShadow(0), NUM2: numShadow(0) },
    },
    {
      kind: 'block',
      type: 'operator_divide',
      inputs: { NUM1: numShadow(0), NUM2: numShadow(0) },
    },
    {
      kind: 'block',
      type: 'operator_random',
      inputs: { FROM: numShadow(1), TO: numShadow(10) },
    },
    { kind: 'label', text: '比较' },
    {
      kind: 'block',
      type: 'operator_gt',
      inputs: { OPERAND1: numShadow(0), OPERAND2: numShadow(0) },
    },
    {
      kind: 'block',
      type: 'operator_lt',
      inputs: { OPERAND1: numShadow(0), OPERAND2: numShadow(0) },
    },
    {
      kind: 'block',
      type: 'operator_equals',
      inputs: { OPERAND1: numShadow(0), OPERAND2: numShadow(0) },
    },
    { kind: 'label', text: '逻辑' },
    { kind: 'block', type: 'operator_and' },
    { kind: 'block', type: 'operator_or' },
    { kind: 'block', type: 'operator_not' },
    { kind: 'label', text: '字符串' },
    {
      kind: 'block',
      type: 'operator_join',
      inputs: { STRING1: strShadow('hello'), STRING2: strShadow('world') },
    },
    {
      kind: 'block',
      type: 'operator_letter_of',
      inputs: { LETTER: numShadow(1), STRING: strShadow('hello') },
    },
    {
      kind: 'block',
      type: 'operator_length',
      inputs: { STRING: strShadow('hello') },
    },
    {
      kind: 'block',
      type: 'operator_contains',
      inputs: { STRING1: strShadow('hello'), STRING2: strShadow('e') },
    },
    { kind: 'label', text: '高级' },
    {
      kind: 'block',
      type: 'operator_mod',
      inputs: { NUM1: numShadow(0), NUM2: numShadow(0) },
    },
    {
      kind: 'block',
      type: 'operator_round',
      inputs: { NUM: numShadow(0) },
    },
    {
      kind: 'block',
      type: 'operator_mathop',
      fields: { OPERATOR: 'abs' },
      inputs: { NUM: numShadow(0) },
    },
  ],
  });
}
