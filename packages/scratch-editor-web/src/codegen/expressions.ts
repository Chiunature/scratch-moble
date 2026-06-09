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
import { moduleExpression, PYTHON_MODULES } from './moduleCall';
import {
  getFieldValue,
  getInputTargetBlock,
  quotePythonString,
} from './helpers';
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
    return `(${inputExpressionToPython(
      block,
      'NUM1',
      '0',
    )} + ${inputExpressionToPython(block, 'NUM2', '0')})`;
  }
  if (block.type === 'operator_subtract') {
    return `(${inputExpressionToPython(
      block,
      'NUM1',
      '0',
    )} - ${inputExpressionToPython(block, 'NUM2', '0')})`;
  }
  if (block.type === 'operator_multiply') {
    return `(${inputExpressionToPython(
      block,
      'NUM1',
      '0',
    )} * ${inputExpressionToPython(block, 'NUM2', '0')})`;
  }
  if (block.type === 'operator_divide') {
    return `(${inputExpressionToPython(
      block,
      'NUM1',
      '0',
    )} / ${inputExpressionToPython(block, 'NUM2', '1')})`;
  }
  if (block.type === 'operator_random') {
    return `_random.randint(${inputExpressionToPython(
      block,
      'FROM',
      '1',
    )}, ${inputExpressionToPython(block, 'TO', '10')})`;
  }
  if (block.type === 'operator_mod') {
    return `(${inputExpressionToPython(
      block,
      'NUM1',
      '0',
    )} % ${inputExpressionToPython(block, 'NUM2', '1')})`;
  }
  if (block.type === 'operator_round') {
    return `_math.round(${inputExpressionToPython(block, 'NUM', '0')})`;
  }
  if (block.type === 'operator_mathop') {
    const op = getFieldValue(block, 'OPERATOR') ?? 'abs';
    const num = inputExpressionToPython(block, 'NUM', '0');
    switch (op) {
      case 'abs':
        return `_math.abs(${num})`;
      case 'floor':
        return `_math.floor(${num})`;
      case 'ceiling':
        return `_math.ceil(${num})`;
      case 'sqrt':
        return `_math.sqrt(${num})`;
      case 'sin':
        return `_math.sin(_math.radians(${num}))`;
      case 'cos':
        return `_math.cos(_math.radians(${num}))`;
      case 'tan':
        return `_math.tan(_math.radians(${num}))`;
      case 'asin':
        return `_math.degrees(_math.asin(${num}))`;
      case 'acos':
        return `_math.degrees(_math.acos(${num}))`;
      case 'atan':
        return `_math.degrees(_math.atan(${num}))`;
      case 'ln':
        return `_math.log(${num})`;
      case 'log':
        return `_math.log10(${num})`;
      case 'e ^':
        return `_math.exp(${num})`;
      case '10 ^':
        return `(_math.pow(10, ${num}))`;
      default:
        return `None  # TODO: unsupported mathop ${op}`;
    }
  }
  if (block.type === 'operator_equals') {
    return `(${inputExpressionToPython(
      block,
      'OPERAND1',
      '0',
    )} == ${inputExpressionToPython(block, 'OPERAND2', '0')})`;
  }
  if (block.type === 'operator_lt') {
    return `(${inputExpressionToPython(
      block,
      'OPERAND1',
      '0',
    )} < ${inputExpressionToPython(block, 'OPERAND2', '0')})`;
  }
  if (block.type === 'operator_gt') {
    return `(${inputExpressionToPython(
      block,
      'OPERAND1',
      '0',
    )} > ${inputExpressionToPython(block, 'OPERAND2', '0')})`;
  }
  if (block.type === 'operator_and') {
    return `(${inputExpressionToPython(
      block,
      'OPERAND1',
      'False',
    )} and ${inputExpressionToPython(block, 'OPERAND2', 'False')})`;
  }
  if (block.type === 'operator_or') {
    return `(${inputExpressionToPython(
      block,
      'OPERAND1',
      'False',
    )} or ${inputExpressionToPython(block, 'OPERAND2', 'False')})`;
  }
  if (block.type === 'operator_not') {
    return `not (${inputExpressionToPython(block, 'OPERAND', 'False')})`;
  }
  if (block.type === 'operator_join') {
    return `str(${inputExpressionToPython(
      block,
      'STRING1',
      "''",
    )}) + str(${inputExpressionToPython(block, 'STRING2', "''")})`;
  }
  if (block.type === 'operator_letter_of') {
    const index = inputExpressionToPython(block, 'LETTER', '1');
    const text = inputExpressionToPython(block, 'STRING', "''");
    return `(str(${text})[int(${index}) - 1])`;
  }
  if (block.type === 'operator_length') {
    return `len(${inputExpressionToPython(block, 'STRING', "''")})`;
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

  const sensorBoolean = sensorBooleanReporterToPython(block);
  const sensorNumber = sensorNumberReporterToPython(block);
  if (sensorBoolean != null) return sensorBoolean;
  if (sensorNumber != null) return sensorNumber;
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

/** field_dropdown / field_number 等直接挂在积木上的字段（非 input_value 槽） */
export function fieldToPython(
  block: ScratchBlock,
  fieldName: string,
  fallback: string,
): string {
  return getFieldValue(block, fieldName) ?? fallback;
}

/** 下拉字段值为字符串枚举（如 advance / retreat）时，输出带引号的 Python 字符串 */
export function fieldStringToPython(
  block: ScratchBlock,
  fieldName: string,
  fallback: string,
): string {
  return quotePythonString(getFieldValue(block, fieldName) ?? fallback);
}

/** 传感器等布尔 reporter 嵌在 CONDITION 等输入槽时的表达式生成 */
function sensorBooleanReporterToPython(block: ScratchBlock): string | null {
  switch (block.type) {
    case BLOCK_TYPES.sensor.touch_sensor.state:
      return moduleExpression(PYTHON_MODULES.sensor.touch_sensor, 'state', [
        valueToPython(block, 'PORTS', '1'),
      ]);

    case BLOCK_TYPES.sensor.gray_sensor.cmpLux:
      return moduleExpression(PYTHON_MODULES.sensor.gray_sensor, 'cmp_lux', [
        valueToPython(block, 'PORTS', '1'),
        fieldStringToPython(block, 'CMP', '>'),
        valueToPython(block, 'VALUE', '50'),
      ]);

    case BLOCK_TYPES.sensor.gray_sensor.luxState:
      return moduleExpression(PYTHON_MODULES.sensor.gray_sensor, 'lux_state', [
        valueToPython(block, 'PORTS', '1'),
      ]);

    case BLOCK_TYPES.sensor.ultrasonic_sensor.cmpValue:
      return moduleExpression(
        PYTHON_MODULES.sensor.ultrasonic_sensor,
        'cmp_value',
        [
          valueToPython(block, 'PORTS', '1'),
          fieldStringToPython(block, 'CMP', '>'),
          valueToPython(block, 'VALUE', '100'),
        ],
      );

    case BLOCK_TYPES.sensor.remote_control_sensor.keyRemote:
      return moduleExpression(PYTHON_MODULES.sensor.other, 'key_remote', [
        valueToPython(block, 'HANDLESHANK', quotePythonString('up')),
        fieldStringToPython(block, 'STATE', 'press'),
      ]);

    case BLOCK_TYPES.sensor.other.keyMast:
      console.log('1', typeof fieldToPython(block, 'STATE', '1'));
      return moduleExpression(PYTHON_MODULES.sensor.other, 'key_mast', [
        fieldStringToPython(block, 'KEY', 'left'),
        fieldToPython(block, 'STATE', '1'),
      ]);

    default:
      return null;
  }
}

const sensorNumberReporterToPython = (block: ScratchBlock): string | null => {
  switch (block.type) {
    case BLOCK_TYPES.sensor.gray_sensor.lux:
      return moduleExpression(PYTHON_MODULES.sensor.gray_sensor, 'lux', [
        valueToPython(block, 'PORTS', '1'),
      ]);
    case BLOCK_TYPES.sensor.ultrasonic_sensor.value:
      return moduleExpression(
        PYTHON_MODULES.sensor.ultrasonic_sensor,
        'value',
        [valueToPython(block, 'PORTS', '1')],
      );
    case BLOCK_TYPES.sensor.remote_control_sensor.readAdcanceLeftOffset:
      return moduleExpression(
        PYTHON_MODULES.sensor.other,
        'read_adcance_left_offset',
      );
    case BLOCK_TYPES.sensor.remote_control_sensor.readAdvanceRightOffset:
      return moduleExpression(
        PYTHON_MODULES.sensor.other,
        'read_advance_right_offset',
      );
    case BLOCK_TYPES.sensor.remote_control_sensor.readRetreatLeftOffset:
      return moduleExpression(
        PYTHON_MODULES.sensor.other,
        'read_retreat_left_offset',
      );
    case BLOCK_TYPES.sensor.remote_control_sensor.readRetreatRightOffset:
      return moduleExpression(
        PYTHON_MODULES.sensor.other,
        'read_retreat_right_offset',
      );
    case BLOCK_TYPES.sensor.other.timer:
      return moduleExpression(PYTHON_MODULES.control, 'timer');
    default:
      return null;
  }
};
/**
 * portShadowMulti 等多端口输入：展开为独立位置参数 `2, 3`，而非 `[2, 3]`。
 * 单端口场景（motor 等）仍用 valueToPython。
 */
export function multiPortsInputToPythonArgs(
  block: ScratchBlock,
  inputName: string,
  fallback: string,
): string[] {
  const targetBlock = getInputTargetBlock(block, inputName);
  if (!targetBlock) {
    return parsePortFieldValue(fallback);
  }

  if (targetBlock.type === BLOCK_TYPES.common.portDropdown) {
    const raw = getFieldValue(targetBlock, 'PORT') ?? fallback;
    return parsePortFieldValue(raw);
  }

  return [expressionBlockToPython(targetBlock)];
}

export function variableFieldToPython(
  block: ScratchBlock,
  fieldName: string,
): string {
  const name = getFieldValue(block, fieldName);
  if (!name) {
    return 'unnamed_var';
  }
  return /^[A-Za-z_][A-Za-z0-9_]*$/.test(name)
    ? name
    : `_${name.replace(/\W/g, '_')}`;
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
