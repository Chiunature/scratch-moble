import { tEditor } from '@scratch-mobile/i18n';
import * as ScratchBlocks from 'scratch-blocks';

import { loadProcedureMutation } from './loadMutation';
import { readProcedureMutation } from './readMutation';
import {
  createProcedureEditorWorkspace,
  disposeProcedureWorkspace,
  refreshProcedureWorkspace,
  setupProcedureDeclarationSync,
  type ProcedureDeclarationBlock,
  type ProcedureEditorWorkspace,
} from './procedureWorkspace';

type ProcedureDefCallback = (mutation?: Element) => void;

type ActiveProcedureEditor = {
  workspace: ProcedureEditorWorkspace;
  declaration: ProcedureDeclarationBlock;
  postEditCallback: ProcedureDefCallback;
  onSaved?: () => void;
};

let activeEditor: ActiveProcedureEditor | null = null;
/** 取消尚未完成的 deferred inject（快速关闭/重复打开弹窗时） */
let pendingOpenId = 0;

function getRequiredElement<T extends Element>(
  root: ParentNode,
  selector: string,
  constructor: { new (...args: never[]): T },
): T {
  const element = root.querySelector(selector);
  if (!(element instanceof constructor)) {
    throw new Error(`Missing procedure editor element: ${selector}`);
  }
  return element;
}

export function applyProcedureModalI18n(modal: HTMLElement): void {
  getRequiredElement(modal, '.scratch-procedure-panel', HTMLElement).setAttribute(
    'aria-label',
    tEditor('procedureModal.ariaLabel'),
  );
  getRequiredElement(modal, '.scratch-procedure-title', HTMLElement).textContent =
    tEditor('procedureModal.title');
  getRequiredElement(
    modal,
    '.scratch-procedure-close',
    HTMLButtonElement,
  ).setAttribute('aria-label', tEditor('procedureModal.close'));
  getRequiredElement(
    modal,
    '[data-action="add-label"]',
    HTMLButtonElement,
  ).textContent = tEditor('procedureModal.addLabel');
  getRequiredElement(
    modal,
    '[data-action="add-string-number"]',
    HTMLButtonElement,
  ).textContent = tEditor('procedureModal.addStringNumber');
  getRequiredElement(
    modal,
    '[data-action="add-boolean"]',
    HTMLButtonElement,
  ).textContent = tEditor('procedureModal.addBoolean');
  getRequiredElement(
    modal,
    '.scratch-procedure-cancel',
    HTMLButtonElement,
  ).textContent = tEditor('procedureModal.cancel');
  getRequiredElement(
    modal,
    '.scratch-procedure-confirm',
    HTMLButtonElement,
  ).textContent = tEditor('procedureModal.confirm');
}

export function ensureProcedureEditorModalDom(): HTMLElement {
  const existing = document.getElementById('scratch-procedure-modal');
  if (existing) {
    applyProcedureModalI18n(existing);
    return existing;
  }

  const modal = document.createElement('div');
  modal.id = 'scratch-procedure-modal';
  modal.className = 'scratch-procedure-modal scratch-procedure-modal-hidden';
  modal.setAttribute('aria-hidden', 'true');

  modal.innerHTML = `
    <div class="scratch-procedure-panel" role="dialog" aria-modal="true" aria-label="制作积木">
      <div class="scratch-procedure-header">
        <div class="scratch-procedure-title">制作积木</div>
        <button class="scratch-procedure-close" type="button" aria-label="关闭">×</button>
      </div>
      <div class="scratch-procedure-toolbar">
        <button class="scratch-procedure-tool" type="button" data-action="add-label">添加标签</button>
        <button class="scratch-procedure-tool" type="button" data-action="add-string-number">添加数字或文本输入项</button>
        <button class="scratch-procedure-tool" type="button" data-action="add-boolean">添加布尔输入项</button>
      </div>
      <div class="scratch-procedure-workspace"></div>
      <div class="scratch-procedure-footer">
        <button class="scratch-procedure-button scratch-procedure-cancel" type="button">取消</button>
        <button class="scratch-procedure-button scratch-procedure-confirm" type="button">确定</button>
      </div>
    </div>`;

  const panel = getRequiredElement(modal, '.scratch-procedure-panel', HTMLElement);
  panel.addEventListener('click', event => event.stopPropagation());
  modal.addEventListener('click', () => closeProcedureEditorModal(false));

  getRequiredElement(modal, '.scratch-procedure-close', HTMLButtonElement).onclick =
    () => closeProcedureEditorModal(false);
  getRequiredElement(modal, '.scratch-procedure-cancel', HTMLButtonElement).onclick =
    () => closeProcedureEditorModal(false);
  getRequiredElement(modal, '.scratch-procedure-confirm', HTMLButtonElement).onclick =
    () => closeProcedureEditorModal(true);

  const toolbar = getRequiredElement(modal, '.scratch-procedure-toolbar', HTMLElement);
  toolbar.addEventListener('click', event => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) {
      return;
    }
    const action = target.dataset.action;
    if (!action || !activeEditor) {
      return;
    }
    if (action === 'add-label') {
      activeEditor.declaration.addLabelExternal?.();
    } else if (action === 'add-string-number') {
      activeEditor.declaration.addStringNumberExternal?.();
    } else if (action === 'add-boolean') {
      activeEditor.declaration.addBooleanExternal?.();
    }
    requestAnimationFrame(() => refreshProcedureWorkspace(activeEditor!.workspace));
  });

  document.body.append(modal);
  applyProcedureModalI18n(modal);
  return modal;
}

function setModalVisible(modal: HTMLElement, visible: boolean): void {
  modal.classList.toggle('scratch-procedure-modal-hidden', !visible);
  modal.setAttribute('aria-hidden', String(!visible));
}

function cleanupActiveEditor(): void {
  ScratchBlocks.WidgetDiv.hide();
  disposeProcedureWorkspace(activeEditor?.workspace ?? null);
  activeEditor = null;
}

export function closeProcedureEditorModal(save: boolean): void {
  pendingOpenId += 1;

  const modal = ensureProcedureEditorModalDom();
  if (!activeEditor) {
    setModalVisible(modal, false);
    return;
  }

  const current = activeEditor;
  if (save) {
    ScratchBlocks.WidgetDiv.hide();
    const mutation = readProcedureMutation(current.declaration);
    if (mutation) {
      current.postEditCallback(mutation);
      current.onSaved?.();
    }
  }

  cleanupActiveEditor();
  getRequiredElement(modal, '.scratch-procedure-workspace', HTMLElement).replaceChildren();
  setModalVisible(modal, false);
}

export function openProcedureEditorModal({
  mutation,
  postEditCallback,
  onSaved,
}: {
  mutation: Element;
  postEditCallback: ProcedureDefCallback;
  onSaved?: () => void;
}): void {
  const modal = ensureProcedureEditorModalDom();
  closeProcedureEditorModal(false);

  const workspaceHost = getRequiredElement(
    modal,
    '.scratch-procedure-workspace',
    HTMLElement,
  );
  workspaceHost.replaceChildren();

  setModalVisible(modal, true);

  const openId = ++pendingOpenId;
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      if (openId !== pendingOpenId) {
        return;
      }
      if (
        workspaceHost.clientWidth <= 0 ||
        workspaceHost.clientHeight <= 0
      ) {
        return;
      }

      const workspace = createProcedureEditorWorkspace(workspaceHost);
      const declaration = loadProcedureMutation(workspace, mutation);
      setupProcedureDeclarationSync(workspace, declaration);
      declaration.setWarp?.(false);
      activeEditor = { workspace, declaration, postEditCallback, onSaved };
      refreshProcedureWorkspace(workspace);
    });
  });
}
