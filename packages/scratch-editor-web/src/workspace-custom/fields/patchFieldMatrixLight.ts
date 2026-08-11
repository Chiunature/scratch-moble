import { Field, fieldRegistry } from 'scratch-blocks';

import {
  DEFAULT_MATRIX_LIGHT_ROWS,
  MATRIX_LIGHT_COL_COUNT,
  MATRIX_LIGHT_ROW_COUNT,
  parseMatrixLightGrid,
  serializeMatrixLightRows,
} from '@scratch-mobile/shared';

import { isReactNativeHost } from '../../bridge/index';
import {
  openMatrixLightEditor,
  type ScratchMatrixLightField,
} from './matrixLightEditor';

const THUMB_NODE = 4;
const THUMB_GAP = 1;
const MATRIX_ON = '#ffffff';
const MATRIX_OFF = '#1e293b';

const THUMB_WIDTH =
  MATRIX_LIGHT_COL_COUNT * (THUMB_NODE + THUMB_GAP) + THUMB_GAP;
const THUMB_HEIGHT =
  MATRIX_LIGHT_ROW_COUNT * (THUMB_NODE + THUMB_GAP) + THUMB_GAP;

type FieldRegistryConstructor = Parameters<typeof fieldRegistry.register>[1];
type FieldMatrixLightInternals = {
  borderRect_?: Element | null;
};

let fieldsRegistered = false;
// 负责「矩阵灯按钮 + 小预览图」
function registerMatrixLightField(): void {
  if (fieldsRegistered) {
    return;
  }
  fieldsRegistered = true;

  class FieldMatrixLight extends Field {
    /** 可编辑自定义字段必须声明 SERIALIZABLE，否则 blockly v12 序列化时告警 */
    SERIALIZABLE = true;

    ledThumbNodes_: SVGRectElement[] = [];
    matrixSvg_: SVGSVGElement | null = null;
    /** 同一次触摸只触发一次 open，避免 pointerdown + showEditor_ 重复 */
    rnOpenGuardPointerId_: number | null = null;

    static fromJson(options: Record<string, unknown>): FieldMatrixLight {
      const value =
        typeof options.value === 'string'
          ? options.value
          : serializeMatrixLightRows(DEFAULT_MATRIX_LIGHT_ROWS);
      return new FieldMatrixLight(value, undefined, options);
    }

    constructor(
      value?: string,
      validator?: (value: string) => string | null,
      config?: Record<string, unknown>,
    ) {
      // Blockly Field: (value, validator, config) — 勿将 value 传到 validator 位
      super(
        value ?? serializeMatrixLightRows(DEFAULT_MATRIX_LIGHT_ROWS),
        validator ?? null,
        config,
      );
    }

    initView(): void {
      const svgNs = 'http://www.w3.org/2000/svg';
      this.matrixSvg_ = document.createElementNS(svgNs, 'svg');
      this.matrixSvg_.setAttribute('width', String(THUMB_WIDTH));
      this.matrixSvg_.setAttribute('height', String(THUMB_HEIGHT));
      this.matrixSvg_.style.cursor = 'pointer';
      this.matrixSvg_.style.pointerEvents = 'all';

      for (let row = 0; row < MATRIX_LIGHT_ROW_COUNT; row += 1) {
        for (let col = 0; col < MATRIX_LIGHT_COL_COUNT; col += 1) {
          const rect = document.createElementNS(svgNs, 'rect');
          rect.setAttribute(
            'x',
            String(THUMB_GAP + col * (THUMB_NODE + THUMB_GAP)),
          );
          rect.setAttribute(
            'y',
            String(THUMB_GAP + row * (THUMB_NODE + THUMB_GAP)),
          );
          rect.setAttribute('width', String(THUMB_NODE));
          rect.setAttribute('height', String(THUMB_NODE));
          rect.setAttribute('rx', '1');
          this.ledThumbNodes_.push(rect);
          this.matrixSvg_.appendChild(rect);
        }
      }

      if (this.fieldGroup_) {
        this.fieldGroup_.appendChild(this.matrixSvg_);
      }

      this.bindRefreshMatrixThumb_();
      this.bindRnOpenOnPointerDown_();
      this.updateMatrix_();
    }

    /**
     * RN：拖完飞栏积木后 showEditor_ 可能很晚才触发；在整块 field 区域 pointerdown 即尝试打开。
     * showEditor_ 仍保留作 pointerup 兜底。
     */
    bindRnOpenOnPointerDown_(): void {
      if (!isReactNativeHost()) {
        return;
      }
      const field = this as unknown as ScratchMatrixLightField;
      const borderRect = (this as unknown as FieldMatrixLightInternals)
        .borderRect_;
      const targets = [this.fieldGroup_, this.matrixSvg_, borderRect].filter(
        (el): el is Element => el != null,
      );

      const tryOpenFromPointer = (event: Event): void => {
        const pointerEvent = event as PointerEvent;
        if (pointerEvent.button !== 0) {
          return;
        }
        if (this.rnOpenGuardPointerId_ === pointerEvent.pointerId) {
          return;
        }
        this.rnOpenGuardPointerId_ = pointerEvent.pointerId;
        if (!field.updateMatrix_) {
          this.bindRefreshMatrixThumb_();
        }
        openMatrixLightEditor(field, pointerEvent);
      };

      const clearPointerGuard = (event: Event): void => {
        const pointerEvent = event as PointerEvent;
        if (this.rnOpenGuardPointerId_ === pointerEvent.pointerId) {
          this.rnOpenGuardPointerId_ = null;
        }
      };

      for (const el of targets) {
        el.addEventListener('pointerdown', tryOpenFromPointer, true);
        el.addEventListener('pointerup', clearPointerGuard, true);
        el.addEventListener('pointercancel', clearPointerGuard, true);
      }
    }

    /** 供 matrixLightEditor 刷新缩略图；须走 prototype，避免覆盖实例方法后自调用栈溢出 */
    bindRefreshMatrixThumb_(): void {
      const field = this as unknown as ScratchMatrixLightField;
      field.updateMatrix_ = (valueOverride?: string) => {
        FieldMatrixLight.prototype.updateMatrix_.call(this, valueOverride);
      };
    }

    updateSize_(): void {
      this.size_.width = THUMB_WIDTH;
      this.size_.height = THUMB_HEIGHT;
      this.positionBorderRect_();
    }

    updateMatrix_(valueOverride?: string): void {
      if (!this.matrixSvg_ || this.ledThumbNodes_.length === 0) {
        return;
      }

      const raw = valueOverride ?? this.getValue();
      if (raw == null || raw === '') {
        return;
      }

      const grid = parseMatrixLightGrid(String(raw));
      for (let row = 0; row < MATRIX_LIGHT_ROW_COUNT; row += 1) {
        for (let col = 0; col < MATRIX_LIGHT_COL_COUNT; col += 1) {
          const node = this.ledThumbNodes_[row * MATRIX_LIGHT_COL_COUNT + col];
          if (!node) {
            continue;
          }
          const rowCells = grid[row];
          const on = rowCells?.[col]?.on ?? false;
          node.setAttribute('fill', on ? MATRIX_ON : MATRIX_OFF);
        }
      }
    }

    doClassValidation_(newValue?: string | null): string | null {
      if (newValue == null || newValue === '') {
        return serializeMatrixLightRows(DEFAULT_MATRIX_LIGHT_ROWS);
      }
      return serializeMatrixLightRows(String(newValue));
    }

    doValueUpdate_(newValue: string): void {
      super.doValueUpdate_(newValue as never);
      this.updateMatrix_(String(newValue));
    }

    showEditor_(e?: Event): void {
      const field = this as unknown as ScratchMatrixLightField;
      if (!field.updateMatrix_) {
        this.bindRefreshMatrixThumb_();
      }
      openMatrixLightEditor(field, e);
    }

    getText_(): string {
      return '';
    }

    getDisplayText_(): string {
      return '';
    }
  }

  fieldRegistry.register(
    'field_matrix_light',
    FieldMatrixLight as unknown as FieldRegistryConstructor,
  );
}

export function patchFieldMatrixLight(): void {
  registerMatrixLightField();
}
