import * as ScratchBlocks from 'scratch-blocks';

const SVG_NS = 'http://www.w3.org/2000/svg';
const XLINK_NS = 'http://www.w3.org/1999/xlink';

export const WORKSPACE_CONTROL_BUTTON_SIZE = 36;
export const WORKSPACE_CONTROL_SMALL_GAP = 4;
export const WORKSPACE_CONTROL_GROUP_GAP = 12;

const ICON_SIZE = 22;
const ICON_OFFSET = (WORKSPACE_CONTROL_BUTTON_SIZE - ICON_SIZE) / 2;
const ICON_OPACITY = 0.75;

type WorkspaceFloatingButtonInput = {
  className: string;
  iconHref: string;
  enabled?: boolean;
  onPress: () => void;
};

export type WorkspaceFloatingButton = {
  root: SVGGElement;
  setEnabled: (enabled: boolean) => void;
  dispose: () => void;
};

function createSvgElement<K extends keyof SVGElementTagNameMap>(
  tagName: K,
): SVGElementTagNameMap[K] {
  return document.createElementNS(SVG_NS, tagName);
}

function setSvgImageHref(el: SVGImageElement, href: string): void {
  el.setAttribute('href', href);
  el.setAttributeNS(XLINK_NS, 'xlink:href', href);
}

export function createWorkspaceFloatingButton({
  className,
  iconHref,
  enabled = true,
  onPress,
}: WorkspaceFloatingButtonInput): WorkspaceFloatingButton {
  let isEnabled = enabled;
  const root = createSvgElement('g');
  root.setAttribute('class', `blocklyZoom ${className}`);
  root.setAttribute('role', 'button');
  root.style.cursor = isEnabled ? 'pointer' : 'default';
  root.style.opacity = isEnabled ? '1' : '0.35';

  const shadow = createSvgElement('circle');
  shadow.setAttribute('cx', String(WORKSPACE_CONTROL_BUTTON_SIZE / 2));
  shadow.setAttribute('cy', String(WORKSPACE_CONTROL_BUTTON_SIZE / 2));
  shadow.setAttribute('r', String(WORKSPACE_CONTROL_BUTTON_SIZE / 2));
  shadow.setAttribute('fill', '#231f20');
  shadow.setAttribute('opacity', '0.15');

  const face = createSvgElement('circle');
  face.setAttribute('cx', String(WORKSPACE_CONTROL_BUTTON_SIZE / 2));
  face.setAttribute('cy', String(WORKSPACE_CONTROL_BUTTON_SIZE / 2));
  face.setAttribute('r', String(WORKSPACE_CONTROL_BUTTON_SIZE / 2 - 2));
  face.setAttribute('fill', '#ffffff');

  const icon = createSvgElement('image');
  setSvgImageHref(icon, iconHref);
  icon.setAttribute('x', String(ICON_OFFSET));
  icon.setAttribute('y', String(ICON_OFFSET));
  icon.setAttribute('width', String(ICON_SIZE));
  icon.setAttribute('height', String(ICON_SIZE));
  icon.setAttribute('opacity', String(ICON_OPACITY));
  icon.setAttribute('preserveAspectRatio', 'xMidYMid meet');
  icon.setAttribute('pointer-events', 'none');

  const handlePointerDown = (event: PointerEvent) => {
    if (isEnabled) {
      onPress();
    }
    ScratchBlocks.Touch.clearTouchIdentifier();
    event.stopPropagation();
    event.preventDefault();
  };

  root.append(shadow, face, icon);
  root.addEventListener('pointerdown', handlePointerDown);

  return {
    root,
    setEnabled(nextEnabled: boolean) {
      isEnabled = nextEnabled;
      root.style.opacity = nextEnabled ? '1' : '0.35';
      root.style.cursor = nextEnabled ? 'pointer' : 'default';
      root.setAttribute('aria-disabled', String(!nextEnabled));
    },
    dispose() {
      root.removeEventListener('pointerdown', handlePointerDown);
      root.remove();
    },
  };
}