import undoIconImport from '../../../assets/zoom/zoom-undo.svg';
import redoIconImport from '../../../assets/zoom/zoom-redo.svg';
import zoomInIconImport from '../../../assets/zoom/zoom-in.svg';
import zoomOutIconImport from '../../../assets/zoom/zoom-out.svg';
import zoomResetIconImport from '../../../assets/zoom/zoom-reset.svg';

export const workspaceControlIcons = {
  undo: undoIconImport as unknown as string,
  redo: redoIconImport as unknown as string,
  zoomIn: zoomInIconImport as unknown as string,
  zoomOut: zoomOutIconImport as unknown as string,
  zoomReset: zoomResetIconImport as unknown as string,
} as const;