import * as ScratchBlocks from 'scratch-blocks';

import type { Workspace } from '../../codegen/types';
import { getCurrentScratchBlocksLocale } from '../../locale/applyEditorLocale';
import { editorTheme } from '../../theme';

export type ProcedureEditorWorkspace = ReturnType<typeof ScratchBlocks.inject>;

export type ProcedureDeclarationBlock = ScratchBlocks.BlockSvg & {
  mutationToDom?: () => Element;
  domToMutation?: (mutation: Element) => void;
  updateDisplay_?: () => void;
  onChangeFn?: () => void;
  addLabelExternal?: () => void;
  addBooleanExternal?: () => void;
  addStringNumberExternal?: () => void;
  setWarp?: (warp: boolean) => void;
};

/** 与 scratch-gui 一致：工作区每次变化时把标签/参数名写回 procCode_，避免添加输入项时按旧 procCode_ 重绘。 */
export function setupProcedureDeclarationSync(
  workspace: ProcedureEditorWorkspace,
  declaration: ProcedureDeclarationBlock,
): void {
  workspace.addChangeListener(() => {
    declaration.onChangeFn?.();
  });
}

export function createProcedureEditorWorkspace(
  host: HTMLElement,
): ProcedureEditorWorkspace {
  ScratchBlocks.ScratchMsgs.setLocale(getCurrentScratchBlocksLocale());

  return ScratchBlocks.inject(host, {
    move: {
      scrollbars: true,
      drag: true,
      wheel: true,
    },
    zoom: {
      controls: false,
      pinch: true,
      wheel: false,
      startScale: 0.85,
      minScale: 0.6,
      maxScale: 1.4,
      scaleSpeed: 1.05,
    },
    grid: {
      spacing: 20,
      length: 20,
      colour: 'rgba(15, 23, 42, 0.10)',
      snap: true,
    },
    media: 'https://unpkg.com/scratch-blocks@2.1.19/media/',
    sounds: false,
    theme: editorTheme,
    modalInputs: false,
  });
}

export function disposeProcedureWorkspace(
  workspace: ProcedureEditorWorkspace | null,
): void {
  workspace?.dispose?.();
}

export function refreshProcedureWorkspace(workspace: Workspace): void {
  workspace.resize?.();
}
