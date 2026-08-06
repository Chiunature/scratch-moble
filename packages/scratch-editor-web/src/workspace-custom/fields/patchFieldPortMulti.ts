import * as ScratchBlocks from 'scratch-blocks';
import {
  FieldDropdown,
  fieldRegistry,
  type BlockSvg,
  type FieldDropdownConfig,
  type FieldDropdownValidator,
  type MenuOption,
} from 'scratch-blocks';

import { formatPortLabel, parsePortFieldValue } from '@scratch-mobile/shared';

//定义端口类型
type PortKind = 'sensor' | 'motor';

//定义端口数据结构
type PortSpec = {
  readonly values: readonly string[];
  readonly defaultValue: readonly string[];
};

//定义端口多选配置
type PortMultiFieldConfig = FieldDropdownConfig & {
  //端口值
  value?: string;
  //端口类型
  portKind?: unknown;
};

//定义端口规格
const PORT_SPECS: Record<PortKind, PortSpec> = {
  sensor: {
    values: ['0', '1', '2', '3'],
    defaultValue: ['0', '1'],
  },
  motor: {
    values: ['4', '5', '6', '7'],
    defaultValue: ['4', '5'],
  },
};

//定义端口多选字段是否已注册
let fieldsRegistered = false;

//定义端口类型
function normalizePortKind(raw: unknown): PortKind {
  return raw === 'motor' ? 'motor' : 'sensor';
}

//定义排序端口
function sortPorts(ports: Iterable<string>, kind: PortKind): string[] {
  const selected = new Set(ports);
  return PORT_SPECS[kind].values.filter(port => selected.has(port));
}

//定义规范化端口多选值（数组层，内部逻辑用）
function normalizePorts(raw: unknown, kind: PortKind): string[] {
  const parsed = parsePortFieldValue(typeof raw === 'string' ? raw : '');
  const ports = sortPorts(parsed, kind).slice(0, 2);
  return ports.length === 2 ? ports : [...PORT_SPECS[kind].defaultValue];
}

//定义规范化端口多选值（字符串层，字段存取边界用）
function normalizePortMultiValue(raw: unknown, kind: PortKind): string {
  return normalizePorts(raw, kind).join(',');
}

//定义显示端口多选值
function displayPortMultiValue(raw: unknown, kind: PortKind): string {
  return normalizePorts(raw, kind)
    .map(formatPortLabel)
    .join('+');
}

//定义配对端口选项
function pairOptions(kind: PortKind): MenuOption[] {
  const { values } = PORT_SPECS[kind];
  return values.flatMap((left, leftIndex) =>
    values
      .slice(leftIndex + 1)
      .map(
        right =>
          [
            `${formatPortLabel(left)}+${formatPortLabel(right)}`,
            `${left},${right}`,
          ] as [string, string],
      ),
  );
}

//定义应用容器样式
function applyContainerStyle(container: HTMLDivElement): void {
  container.style.display = 'grid';
  container.style.gap = '6px';
  container.style.minWidth = '116px';
  container.style.padding = '8px';
  container.style.userSelect = 'none';
  container.style.touchAction = 'manipulation';
}

//定义应用行样式
function applyRowStyle(row: HTMLButtonElement, selected: boolean): void {
  row.style.display = 'flex';
  row.style.alignItems = 'center';
  row.style.gap = '8px';
  row.style.width = '100%';
  row.style.minHeight = '36px';
  row.style.padding = '6px 10px';
  row.style.border = '0';
  row.style.borderRadius = '10px';
  row.style.background = selected ? 'rgba(255, 255, 255, 0.24)' : 'transparent';
  row.style.color = '#fff';
  row.style.font =
    '600 14px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
  row.style.textAlign = 'left';
  row.style.cursor = 'pointer';
}

//定义应用框样式
function applyBoxStyle(box: HTMLSpanElement, selected: boolean): void {
  box.textContent = selected ? '✓' : '';
  box.style.display = 'inline-flex';
  box.style.alignItems = 'center';
  box.style.justifyContent = 'center';
  box.style.width = '18px';
  box.style.height = '18px';
  box.style.border = '2px solid rgba(255, 255, 255, 0.86)';
  box.style.borderRadius = '5px';
  box.style.background = selected ? 'rgba(255, 255, 255, 0.28)' : 'transparent';
  box.style.boxSizing = 'border-box';
  box.style.fontSize = '13px';
  box.style.lineHeight = '1';
}

//定义注册端口多选字段
function registerPortMultiField(): void {
  //如果端口多选字段已注册，则返回
  if (fieldsRegistered) {
    return;
  }
  //没有的话 下面开始注册 并且设置为true 表示已注册
  fieldsRegistered = true;

  //继承FieldDropdown类，开始改造
  class FieldPortMulti extends FieldDropdown {
    private portKind_: PortKind;
    private originalStyle_: string | null = null;

    static fromJson(options: PortMultiFieldConfig): FieldPortMulti {
      const portKind = normalizePortKind(options.portKind);
      const value = normalizePortMultiValue(options.value, portKind);
      return new FieldPortMulti(portKind, value, undefined, options);
    }

    constructor(
      portKind: PortKind,
      value?: string,
      validator?: FieldDropdownValidator,
      config?: PortMultiFieldConfig,
    ) {
      super(pairOptions(portKind), validator, {
        ...config,
        value: normalizePortMultiValue(value, portKind),
      } as FieldDropdownConfig);
      this.portKind_ = portKind;
      this.setValue(normalizePortMultiValue(value, portKind));
    }

    showEditor_(): void {
      const sourceBlock = this.getSourceBlock() as BlockSvg | null;
      if (!sourceBlock) {
        return;
      }

      ScratchBlocks.DropDownDiv.clearContent();
      ScratchBlocks.DropDownDiv.setColour(
        sourceBlock.getColour(),
        sourceBlock.getColourTertiary(),
      );

      this.applySelectedStyle_(sourceBlock);

      const content = ScratchBlocks.DropDownDiv.getContentDiv();
      const container = document.createElement('div');
      applyContainerStyle(container);

      // 模板字符串一次性生成行结构（port 来自 PORT_SPECS 硬编码常量，无注入风险）
      container.innerHTML = PORT_SPECS[this.portKind_].values
        .map(
          port =>
            `<button type="button" role="checkbox" aria-checked="false" data-port="${port}"><span aria-hidden="true"></span>${formatPortLabel(port)}</button>`,
        )
        .join('');

      const rows = [
        ...container.querySelectorAll<HTMLButtonElement>('button[data-port]'),
      ];
      let draftPorts = normalizePorts(this.getValue(), this.portKind_);

      const commitIfComplete = (): void => {
        if (draftPorts.length !== 2) {
          return;
        }
        this.setValue(sortPorts(draftPorts, this.portKind_).join(','));
      };

      const refresh = (): void => {
        const selected = new Set(draftPorts);
        for (const row of rows) {
          const isSelected = selected.has(row.dataset.port as string);
          applyRowStyle(row, isSelected);
          applyBoxStyle(row.firstElementChild as HTMLSpanElement, isSelected);
          row.setAttribute('aria-checked', String(isSelected));
        }
      };

      // 事件委托：一个监听管所有行，靠 data-port 分发
      container.addEventListener('click', event => {
        event.preventDefault();
        event.stopPropagation();
        const target = event.target as HTMLElement;
        const row = target.closest('button[data-port]') as
          | HTMLButtonElement
          | null;
        if (!row) {
          return;
        }
        const port = row.dataset.port as string;
        if (draftPorts.includes(port)) {
          draftPorts = draftPorts.filter(item => item !== port);
        } else if (draftPorts.length < 2) {
          draftPorts = sortPorts([...draftPorts, port], this.portKind_);
          commitIfComplete();
        }
        refresh();
      });

      content.appendChild(container);
      refresh();

      ScratchBlocks.DropDownDiv.showPositionedByField(
        this as FieldDropdown,
        this.dropdownDispose_.bind(this),
      );
    }

    private applySelectedStyle_(sourceBlock: BlockSvg): void {
      const style = sourceBlock.getStyle();
      if (sourceBlock.isShadow()) {
        this.originalStyle_ = sourceBlock.getStyleName();
        sourceBlock.setStyle(`${this.originalStyle_}_selected`);
        return;
      }
      if (this.borderRect_) {
        this.borderRect_.setAttribute(
          'fill',
          'colourQuaternary' in style
            ? String(style.colourQuaternary)
            : sourceBlock.getColourTertiary(),
        );
      }
    }

    dropdownDispose_(): void {
      const sourceBlock = this.getSourceBlock() as BlockSvg | null;
      if (sourceBlock?.isShadow() && this.originalStyle_) {
        sourceBlock.setStyle(this.originalStyle_);
      }
      this.originalStyle_ = null;
    }

    doClassValidation_(newValue?: string | null): string | null {
      return normalizePortMultiValue(newValue, this.portKind_ ?? 'sensor');
    }

    getText_(): string {
      return displayPortMultiValue(this.getValue(), this.portKind_ ?? 'sensor');
    }

    getDisplayText_(): string {
      return this.getText_();
    }
  }

  fieldRegistry.register(
    'field_port_multi',
    FieldPortMulti as unknown as typeof FieldDropdown,
  );
}

//定义补丁端口多选字段
export function patchFieldPortMulti(): void {
  registerPortMultiField();
}
