import * as ScratchBlocks from 'scratch-blocks';
import type * as Blockly from 'blockly/core';

import type { Workspace } from '../../codegen/types';
import {
  createWorkspaceFloatingButton,
  WORKSPACE_CONTROL_BUTTON_SIZE,
  WORKSPACE_CONTROL_GROUP_GAP,
  WORKSPACE_CONTROL_SMALL_GAP,
  type WorkspaceFloatingButton,
} from './controlButton';
import { workspaceControlIcons } from './icons';

export type WorkspaceFloatingHistoryState = {
  canUndo: boolean;
  canRedo: boolean;
};

export type WorkspaceFloatingControlHandlers = {
  onUndo: () => void;
  onRedo: () => void;
};

type ZoomableWorkspace = Workspace & {
  beginCanvasTransition?: () => void;
  endCanvasTransition?: () => void;
  scrollCenter?: () => void;
  zoomCenter?: (amount: number) => void;
  scale?: number;
  id?: string;
};

type ButtonEntry = {
  button: WorkspaceFloatingButton;
  afterGap: number;
};

const CONTROLS_ID = 'workspaceFloatingControls';
const CONTROLS_CLASS = 'scratchWorkspaceFloatingControls';
const CONTROLS_MARGIN = 20;
const CONTROLS_WEIGHT = 2;
const ZOOM_TRANSITION_MS = 500;

let activeControls: WorkspaceFloatingControls | null = null;

function layoutButtonEntries(entries: ButtonEntry[]): number {
  let y = 0;
  entries.forEach((entry, index) => {
    entry.button.root.setAttribute('transform', `translate(0, ${y})`);
    y += WORKSPACE_CONTROL_BUTTON_SIZE;
    if (index < entries.length - 1) {
      y += entry.afterGap;
    }
  });
  return y;
}

function fireZoomEvent(workspace: ZoomableWorkspace): void {
  const events = ScratchBlocks.Events as unknown as {
    CLICK?: string;
    fire?: (event: unknown) => void;
    get?: (eventType: string) => new (...args: unknown[]) => unknown;
  };
  const eventType = events.CLICK;
  if (!eventType || !events.get || !events.fire || !workspace.id) {
    return;
  }

  const ClickEvent = events.get(eventType);
  events.fire(new ClickEvent(null, workspace.id, 'zoom_controls'));
}

class WorkspaceFloatingControls implements Blockly.IPositionable {
  id = CONTROLS_ID;

  private readonly group: SVGGElement;
  private readonly undoButton: WorkspaceFloatingButton;
  private readonly redoButton: WorkspaceFloatingButton;
  private readonly buttons: WorkspaceFloatingButton[];
  private readonly height: number;
  private left = 0;
  private top = 0;
  private initialized = false;

  constructor(
    private readonly workspace: ZoomableWorkspace,
    handlers: WorkspaceFloatingControlHandlers,
  ) {
    this.group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    this.group.setAttribute('class', CONTROLS_CLASS);

    this.undoButton = createWorkspaceFloatingButton({
      className: 'scratchWorkspaceFloatingUndo',
      iconHref: workspaceControlIcons.undo,
      enabled: false,
      onPress: handlers.onUndo,
    });
    this.redoButton = createWorkspaceFloatingButton({
      className: 'scratchWorkspaceFloatingRedo',
      iconHref: workspaceControlIcons.redo,
      enabled: false,
      onPress: handlers.onRedo,
    });
    const zoomInButton = createWorkspaceFloatingButton({
      className: 'blocklyZoomIn',
      iconHref: workspaceControlIcons.zoomIn,
      onPress: () => this.zoom(1),
    });
    const zoomOutButton = createWorkspaceFloatingButton({
      className: 'blocklyZoomOut',
      iconHref: workspaceControlIcons.zoomOut,
      onPress: () => this.zoom(-1),
    });

    const entries: ButtonEntry[] = [
      { button: this.undoButton, afterGap: WORKSPACE_CONTROL_SMALL_GAP },
      { button: this.redoButton, afterGap: WORKSPACE_CONTROL_GROUP_GAP },
      { button: zoomInButton, afterGap: WORKSPACE_CONTROL_SMALL_GAP },
      { button: zoomOutButton, afterGap: WORKSPACE_CONTROL_GROUP_GAP },
    ];

    if (this.workspace.isMovable()) {
      entries.push({
        button: createWorkspaceFloatingButton({
          className: 'blocklyZoomReset',
          iconHref: workspaceControlIcons.zoomReset,
          onPress: () => this.resetZoom(),
        }),
        afterGap: 0,
      });
    }

    this.buttons = entries.map(entry => entry.button);
    this.height = layoutButtonEntries(entries);
    this.group.append(...this.buttons.map(button => button.root));
  }

  createDom(): SVGGElement {
    return this.group;
  }

  init(): void {
    const svgGroup = this.workspace.getSvgGroup?.();
    const componentManager = this.workspace.getComponentManager?.();
    if (!svgGroup || !componentManager || this.initialized) {
      return;
    }

    svgGroup.appendChild(this.group);
    componentManager.addComponent(
      {
        component: this,
        weight: CONTROLS_WEIGHT,
        capabilities: [ScratchBlocks.ComponentManager.Capability.POSITIONABLE],
      },
      true,
    );
    this.initialized = true;
  }

  dispose(): void {
    const componentManager = this.workspace.getComponentManager?.();
    try {
      componentManager?.removeComponent(CONTROLS_ID);
    } catch {
      // Blockly can remove positioned components during workspace teardown.
    }
    this.buttons.forEach(button => button.dispose());
    this.group.remove();
    this.initialized = false;
  }

  getBoundingRectangle(): Blockly.utils.Rect {
    return new ScratchBlocks.utils.Rect(
      this.top,
      this.top + this.height,
      this.left,
      this.left + WORKSPACE_CONTROL_BUTTON_SIZE,
    );
  }

  position(
    metrics: Blockly.MetricsManager.UiMetrics,
    savedPositions: Blockly.utils.Rect[],
  ): void {
    if (!this.initialized) {
      return;
    }

    const cornerPosition = ScratchBlocks.uiPosition.getCornerOppositeToolbox(
      this.workspace,
      metrics,
    );
    const startRect = ScratchBlocks.uiPosition.getStartPositionRect(
      cornerPosition,
      new ScratchBlocks.utils.Size(
        WORKSPACE_CONTROL_BUTTON_SIZE,
        this.height,
      ),
      CONTROLS_MARGIN,
      CONTROLS_MARGIN,
      metrics,
      this.workspace,
    );
    const bumpDirection =
      cornerPosition.vertical === ScratchBlocks.uiPosition.verticalPosition.TOP
        ? ScratchBlocks.uiPosition.bumpDirection.DOWN
        : ScratchBlocks.uiPosition.bumpDirection.UP;
    const positionRect = ScratchBlocks.uiPosition.bumpPositionRect(
      startRect,
      CONTROLS_MARGIN,
      bumpDirection,
      savedPositions,
    );

    this.left = positionRect.left;
    this.top = positionRect.top;
    this.group.setAttribute('transform', `translate(${this.left}, ${this.top})`);
  }

  updateHistoryState(state: WorkspaceFloatingHistoryState): void {
    this.undoButton.setEnabled(state.canUndo);
    this.redoButton.setEnabled(state.canRedo);
  }

  private zoom(amount: number): void {
    this.workspace.markFocused?.();
    this.workspace.zoomCenter?.(amount);
    fireZoomEvent(this.workspace);
  }

  private resetZoom(): void {
    this.workspace.markFocused?.();

    const zoomOptions = this.workspace.options.zoomOptions;
    const targetScale = zoomOptions.startScale ?? 1;
    const currentScale = this.workspace.scale ?? targetScale;
    const speed = zoomOptions.scaleSpeed ?? 1;
    const amount = Math.log(targetScale / currentScale) / Math.log(speed);

    this.workspace.beginCanvasTransition?.();
    if (Number.isFinite(amount)) {
      this.workspace.zoomCenter?.(amount);
    }
    this.workspace.scrollCenter?.();
    window.setTimeout(() => {
      this.workspace.endCanvasTransition?.();
    }, ZOOM_TRANSITION_MS);

    fireZoomEvent(this.workspace);
  }
}

export function setupWorkspaceFloatingControls(
  workspace: Workspace,
  handlers: WorkspaceFloatingControlHandlers,
): void {
  activeControls?.dispose();
  activeControls = new WorkspaceFloatingControls(
    workspace as ZoomableWorkspace,
    handlers,
  );
  activeControls.init();
  workspace.resize?.();
}

export function updateWorkspaceFloatingHistoryState(
  state: WorkspaceFloatingHistoryState,
): void {
  activeControls?.updateHistoryState(state);
}