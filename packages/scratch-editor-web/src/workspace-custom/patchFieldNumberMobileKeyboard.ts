import { FieldTextInput, fieldRegistry } from 'scratch-blocks';

/**
 * 移动端 Scratch 数字槽键盘策略。
 *
 * 须在 `ScratchBlocks.inject()` 之后调用（inject 内才注册 ScratchFieldNumber）。
 *
 * | 模式 | 行为 |
 * |------|------|
 * | `numpad-only` | 触摸：蓝 NumPad + 拦截 `select()` + `inputmode=none`，尽量不叠系统键盘 |
 * | `system-only` | 始终走 `FieldTextInput.showEditor_(e, false)`，只用系统键盘 |
 *
 * 另：对所有 Scratch 数字字段的 inline input 设 `inputMode=decimal`（系统键盘时尽量数字布局）。
 */
export type ScratchNumberKeyboardMode = 'numpad-only' | 'system-only';

/** Scratch 数字字段运行时特征（用于探测，非公开 API） */
type ScratchNumberField = FieldTextInput & {
  getNumRestrictor?: () => RegExp;
  htmlInput_: HTMLInputElement | null;
};

type ShowEditorFn = (this: unknown, e?: PointerEvent) => void;

const fieldTextShowEditor = (
  FieldTextInput.prototype as unknown as {
    showEditor_: (this: unknown, e?: Event, quietInput?: boolean) => void;
  }
).showEditor_;

/** inject 前保存的 ScratchFieldNumber#showEditor_ 原实现 */
let scratchShowEditorOrig: ShowEditorFn | null = null;
let widgetCreatePatched = false;

// ---------------------------------------------------------------------------
// HTMLInputElement#select 守卫（仅 numpad-only 安装）
// Scratch 触摸路径末尾会 select()，WebView 常因此再弹系统键盘
// ---------------------------------------------------------------------------
const selectGuard = {
  saved: null as typeof HTMLInputElement.prototype.select | null,
  fn: null as typeof HTMLInputElement.prototype.select | null,
  /** 为 true 时，当前调用栈内对 `.blocklyHtmlInput` 的 select() 变为空操作 */
  skip: false,
};

function installSelectGuard(): void {
  if (selectGuard.fn) {
    HTMLInputElement.prototype.select = selectGuard.fn;
    return;
  }
  selectGuard.saved ??= HTMLInputElement.prototype.select;
  selectGuard.fn = function (this: HTMLInputElement) {
    if (selectGuard.skip && this.classList.contains('blocklyHtmlInput')) {
      return;
    }
    return selectGuard.saved!.call(this);
  };
  HTMLInputElement.prototype.select = selectGuard.fn;
}

/** 仅当 prototype 上仍是本模块的 guard 时才恢复，避免覆盖其他 patch */
function uninstallSelectGuard(): void {
  if (selectGuard.fn && HTMLInputElement.prototype.select === selectGuard.fn) {
    HTMLInputElement.prototype.select = selectGuard.saved!;
  }
}

/** 在 Scratch 原 showEditor_ 执行期间屏蔽对 Blockly 隐藏 input 的 select() */
function withSelectGuardSkipped(run: () => void): void {
  selectGuard.skip = true;
  try {
    run();
  } finally {
    selectGuard.skip = false;
  }
}

// ---------------------------------------------------------------------------
// widgetCreate_：系统键盘场景下尽量弹出数字键盘
// ---------------------------------------------------------------------------
function ensureWidgetCreatePatch(): void {
  if (widgetCreatePatched) {
    return;
  }
  widgetCreatePatched = true;

  const orig = (
    FieldTextInput.prototype as unknown as {
      widgetCreate_: () => HTMLInputElement | HTMLTextAreaElement;
    }
  ).widgetCreate_;

  (
    FieldTextInput.prototype as unknown as {
      widgetCreate_: () => HTMLInputElement | HTMLTextAreaElement;
    }
  ).widgetCreate_ = function (this: FieldTextInput) {
    const input = orig.call(this);
    const field = this as ScratchNumberField;
    if (typeof field.getNumRestrictor === 'function' && input instanceof HTMLInputElement) {
      input.inputMode = 'decimal';
      input.autocomplete = 'off';
    }
    return input;
  };
}

// ---------------------------------------------------------------------------
// 探测 ScratchFieldNumber 原型（field_number + getNumRestrictor）
// ---------------------------------------------------------------------------
function getScratchNumberProto(): { showEditor_: ShowEditorFn } | null {
  const probe = fieldRegistry.fromJson({
    type: 'field_number',
    name: '_keyboard_probe_',
    value: 0,
  } as { type: string; name: string; value: number }) as ScratchNumberField | null;

  if (!probe || typeof probe.getNumRestrictor !== 'function') {
    console.warn(
      '[patchFieldNumberMobileKeyboard] 未检测到 ScratchFieldNumber。请在 ScratchBlocks.inject() 之后再调用。',
    );
    return null;
  }

  const proto = Object.getPrototypeOf(probe) as { showEditor_: ShowEditorFn };
  scratchShowEditorOrig ??= proto.showEditor_;
  return proto;
}

/** 触摸 NumPad 路径：保留原生光标，用 inputmode 压低系统键盘概率 */
function tuneInputForNumPad(input: HTMLInputElement): void {
  input.readOnly = false;
  input.setAttribute('inputmode', 'none');
}

/**
 * 按设备策略 patch ScratchFieldNumber#showEditor_。
 * @param mode 默认 `numpad-only`（平板：蓝键盘为主）
 */
export function patchFieldNumberMobileKeyboard(
  mode: ScratchNumberKeyboardMode = 'numpad-only',
): void {
  ensureWidgetCreatePatch();

  const proto = getScratchNumberProto();
  const orig = scratchShowEditorOrig;
  if (!proto || !orig) {
    return;
  }

  if (mode === 'system-only') {
    uninstallSelectGuard();
    proto.showEditor_ = function (this: unknown, e?: PointerEvent) {
      return fieldTextShowEditor.call(this, e, false);
    };
    return;
  }

  // numpad-only：非触摸走 Scratch 默认；触摸走 NumPad 并抑制 select 触发的系统键盘
  installSelectGuard();
  proto.showEditor_ = function (this: unknown, e?: PointerEvent) {
    const field = this as ScratchNumberField;
    if (e?.pointerType !== 'touch') {
      return orig.call(field, e);
    }
    withSelectGuardSkipped(() => orig.call(field, e));
    if (field.htmlInput_) {
      tuneInputForNumPad(field.htmlInput_);
    }
  };
}
