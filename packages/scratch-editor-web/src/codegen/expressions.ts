import {
  parsePortFieldValue,
  pitchToDisplayName,
  clampNotePitch,
  normalizeHandleShankKey,
} from '@scratch-mobile/shared';

import {
  BLOCK_TYPES,
  CUSTOM_NUMERIC_LITERAL_TYPES,
} from '../blocks/blockTypes';
import { getFieldValue, getInputTargetBlock, quotePythonString } from './helpers';
import type { ScratchBlock } from './types';

const NUMERIC_LITERAL_BLOCK_TYPES = new Set([
  'math_number',
  'math_positive_number',
  'math_whole_number',
  'math_integer',
  ...CUSTOM_NUMERIC_LITERAL_TYPES,
]);

function inputExpressionToPython(
  block: ScratchBlock,
  inputName: string,
  fallback: string,
): string {
  const target = getInputTargetBlock(block, inputName);
  return target ? expressionBlockToPython(target) : fallback;
}

export function expressionBlockToPython(block: ScratchBlock): string {
  if (NUMERIC_LITERAL_BLOCK_TYPES.has(block.type)) {
    return getFieldValue(block, 'NUM') ?? '0';
  }

  if (block.type === BLOCK_TYPES.common.portDropdown) {
    const raw = getFieldValue(block, 'PORT') ?? '0';
    const ports = parsePortFieldValue(raw);
    if (ports.length === 1) {
      return ports[0]!;
    }
    return `[${ports.join(', ')}]`;
  }

  if (block.type === 'text') {
    return quotePythonString(getFieldValue(block, 'TEXT') ?? '');
  }

  if (block.type === BLOCK_TYPES.common.notePicker) {
    const raw = getFieldValue(block, 'NOTE') ?? '12';
    const pitch = Number(raw);
    const name = Number.isFinite(pitch)
      ? pitchToDisplayName(clampNotePitch(pitch))
      : raw;
    return quotePythonString(name);
  }

  if (block.type === BLOCK_TYPES.common.handleShankPicker) {
    const raw = getFieldValue(block, 'HANDLESHANK') ?? 'up';
    return quotePythonString(normalizeHandleShankKey(raw));
  }

  if (block.type === 'operator_add') {
    return `(${inputExpressionToPython(block, 'NUM1', '0')} + ${inputExpressionToPython(block, 'NUM2', '0')})`;
  }
  if (block.type === 'operator_subtract') {
    return `(${inputExpressionToPython(block, 'NUM1', '0')} - ${inputExpressionToPython(block, 'NUM2', '0')})`;
  }
  if (block.type === 'operator_multiply') {
    return `(${inputExpressionToPython(block, 'NUM1', '0')} * ${inputExpressionToPython(block, 'NUM2', '0')})`;
  }
  if (block.type === 'operator_divide') {
    return `(${inputExpressionToPython(block, 'NUM1', '0')} / ${inputExpressionToPython(block, 'NUM2', '1')})`;
  }
  if (block.type === 'operator_random') {
    return `random.randint(int(${inputExpressionToPython(block, 'FROM', '1')}), int(${inputExpressionToPython(block, 'TO', '10')}))`;
  }
  if (block.type === 'operator_mod') {
    return `(${inputExpressionToPython(block, 'NUM1', '0')} % ${inputExpressionToPython(block, 'NUM2', '1')})`;
  }
  if (block.type === 'operator_round') {
    return `round(${inputExpressionToPython(block, 'NUM', '0')})`;
  }
  if (block.type === 'operator_mathop') {
    const op = getFieldValue(block, 'OPERATOR') ?? 'abs';
    const num = inputExpressionToPython(block, 'NUM', '0');
    switch (op) {
      case 'abs':
        return `abs(${num})`;
      case 'floor':
        return `math.floor(${num})`;
      case 'ceiling':
        return `math.ceil(${num})`;
      case 'sqrt':
        return `math.sqrt(${num})`;
      case 'sin':
        return `math.sin(math.radians(${num}))`;
      case 'cos':
        return `math.cos(math.radians(${num}))`;
      case 'tan':
        return `math.tan(math.radians(${num}))`;
      case 'asin':
        return `math.degrees(math.asin(${num}))`;
      case 'acos':
        return `math.degrees(math.acos(${num}))`;
      case 'atan':
        return `math.degrees(math.atan(${num}))`;
      case 'ln':
        return `math.log(${num})`;
      case 'log':
        return `math.log10(${num})`;
      case 'e ^':
        return `math.exp(${num})`;
      case '10 ^':
        return `(10 ** ${num})`;
      default:
        return `None  # TODO: unsupported mathop ${op}`;
    }
  }
  if (block.type === 'operator_equals') {
    return `(${inputExpressionToPython(block, 'OPERAND1', '0')} == ${inputExpressionToPython(block, 'OPERAND2', '0')})`;
  }
  if (block.type === 'operator_lt') {
    return `(${inputExpressionToPython(block, 'OPERAND1', '0')} < ${inputExpressionToPython(block, 'OPERAND2', '0')})`;
  }
  if (block.type === 'operator_gt') {
    return `(${inputExpressionToPython(block, 'OPERAND1', '0')} > ${inputExpressionToPython(block, 'OPERAND2', '0')})`;
  }
  if (block.type === 'operator_and') {
    return `(${inputExpressionToPython(block, 'OPERAND1', 'False')} and ${inputExpressionToPython(block, 'OPERAND2', 'False')})`;
  }
  if (block.type === 'operator_or') {
    return `(${inputExpressionToPython(block, 'OPERAND1', 'False')} or ${inputExpressionToPython(block, 'OPERAND2', 'False')})`;
  }
  if (block.type === 'operator_not') {
    return `(not ${inputExpressionToPython(block, 'OPERAND', 'False')})`;
  }
  if (block.type === 'operator_join') {
    return `str(${inputExpressionToPython(block, 'STRING1', "''")}) + str(${inputExpressionToPython(block, 'STRING2', "''")})`;
  }
  if (block.type === 'operator_letter_of') {
    const index = inputExpressionToPython(block, 'LETTER', '1');
    const text = inputExpressionToPython(block, 'STRING', "''");
    return `(str(${text})[max(0, int(${index}) - 1)] if str(${text}) else '')`;
  }
  if (block.type === 'operator_length') {
    return `len(str(${inputExpressionToPython(block, 'STRING', "''")}))`;
  }
  if (block.type === 'operator_contains') {
    const haystack = inputExpressionToPython(block, 'STRING1', "''");
    const needle = inputExpressionToPython(block, 'STRING2', "''");
    return `(str(${needle}) in str(${haystack}))`;
  }

  if (block.type === 'data_variable') {
    return variableFieldToPython(block, 'VARIABLE');
  }
  if (block.type === 'data_listcontents') {
    return variableFieldToPython(block, 'LIST');
  }
  if (block.type === 'data_itemoflist') {
    const lst = variableFieldToPython(block, 'LIST');
    const index = valueToPython(block, 'INDEX', '1');
    return `${lst}[int(${index}) - 1]`;
  }
  if (block.type === 'data_lengthoflist') {
    return `len(${variableFieldToPython(block, 'LIST')})`;
  }
  if (block.type === 'data_listcontainsitem') {
    const lst = variableFieldToPython(block, 'LIST');
    const item = valueToPython(block, 'ITEM', 'None');
    return `(${item} in ${lst})`;
  }
  if (block.type === 'data_itemnumoflist') {
    const lst = variableFieldToPython(block, 'LIST');
    const item = valueToPython(block, 'ITEM', 'None');
    return `(${lst}.index(${item}) + 1 if ${item} in ${lst} else 0)`;
  }

  return `None  # TODO: unsupported expression ${block.type}`;
}

export function valueToPython(
  block: ScratchBlock,
  inputName: string,
  fallback: string,
): string {
  const targetBlock = getInputTargetBlock(block, inputName);
  return targetBlock ? expressionBlockToPython(targetBlock) : fallback;
}

export function variableFieldToPython(block: ScratchBlock, fieldName: string): string {
  const name = getFieldValue(block, fieldName);
  if (!name) {
    return 'unnamed_var';
  }
  return /^[A-Za-z_][A-Za-z0-9_]*$/.test(name) ? name : `_${name.replace(/\W/g, '_')}`;
}

/** play_music 第一参：统一输出带引号的音名字符串（非 pitch 整数）。 */
export function noteValueToPython(
  block: ScratchBlock,
  inputName: string,
  defaultPitch: number,
): string {
  const targetBlock = getInputTargetBlock(block, inputName);
  if (!targetBlock) {
    return quotePythonString(pitchToDisplayName(defaultPitch));
  }

  if (targetBlock.type === BLOCK_TYPES.common.notePicker) {
    return expressionBlockToPython(targetBlock);
  }

  if (NUMERIC_LITERAL_BLOCK_TYPES.has(targetBlock.type)) {
    const raw = getFieldValue(targetBlock, 'NUM') ?? String(defaultPitch);
    const pitch = Number(raw);
    if (Number.isFinite(pitch)) {
      return quotePythonString(pitchToDisplayName(clampNotePitch(pitch)));
    }
  }

  if (targetBlock.type === 'text') {
    return expressionBlockToPython(targetBlock);
  }

  return quotePythonString(pitchToDisplayName(defaultPitch));
}
