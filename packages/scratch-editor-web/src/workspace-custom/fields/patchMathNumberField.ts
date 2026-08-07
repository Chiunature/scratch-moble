import * as ScratchBlocks from 'scratch-blocks';

/**
 * scratch-blocks 内置数字 reporter 的 NUM 字段默认是原生 field_number，移动端会弹
 * Scratch/Blockly 自带数字输入。这里在块定义层把它们统一换成 field_number_keyboard，
 * 让内置变量/列表积木和项目自定义积木共用同一个移动端数字键盘编辑器。
 *
 * 注意：列表「删除第几项 / 在第几项插入 / 替换第几项 / 第几项」的 INDEX 槽
 * 不是 math_number，而是 math_integer，所以必须一起覆盖。
 */
type NumberBlockType =
  | 'math_number'
  | 'math_integer'
  | 'math_whole_number'
  | 'math_positive_number';

type NumberBlockPatchSpec = {
  type: NumberBlockType;
  min?: number;
  precision?: number;
};

const NUMBER_BLOCK_PATCHES: readonly NumberBlockPatchSpec[] = [
  { type: 'math_number' },
  { type: 'math_integer', precision: 1 },
  { type: 'math_whole_number', min: 0, precision: 1 },
  { type: 'math_positive_number', min: 0 },
] as const;

let patched = false;

function patchNumberBlockWithKeyboard({
  type,
  min,
  precision,
}: NumberBlockPatchSpec): void {
  ScratchBlocks.Blocks[type] = {
    init(this: ScratchBlocks.Block) {
      this.jsonInit({
        message0: '%1',
        args0: [
          {
            type: 'field_number_keyboard',
            name: 'NUM',
            value: 0,
            ...(min !== undefined ? { min } : {}),
            ...(precision !== undefined ? { precision } : {}),
          },
        ],
        output: 'Number',
        outputShape: ScratchBlocks.OUTPUT_SHAPE_ROUND,
        extensions: ['colours_textfield'],
      });
    },
  };
}

/** 替换内置数字 reporter 块定义。须在 `ScratchBlocks.inject()` 之前调用。 */
export function patchMathNumberField(): void {
  if (patched) {
    return;
  }

  for (const spec of NUMBER_BLOCK_PATCHES) {
    patchNumberBlockWithKeyboard(spec);
  }

  patched = true;
}
