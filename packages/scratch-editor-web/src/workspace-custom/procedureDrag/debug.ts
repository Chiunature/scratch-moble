/** 排查自制积木拖动问题时设为 true：window.__SCRATCH_DEBUG_PROCEDURE_DRAG__ = true */
export function isProcedureDragDebugEnabled(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }
  return (
    (window as { __SCRATCH_DEBUG_PROCEDURE_DRAG__?: boolean })
      .__SCRATCH_DEBUG_PROCEDURE_DRAG__ === true
  );
}

export function logProcedureDrag(
  scope: 'reporter' | 'definition',
  event: string,
  detail?: Record<string, unknown>,
): void {
  if (!isProcedureDragDebugEnabled()) {
    return;
  }
  const prefix =
    scope === 'reporter' ? '[ProcedureDrag:reporter]' : '[ProcedureDrag:definition]';
  if (detail) {
    console.log(prefix, event, detail);
  } else {
    console.log(prefix, event);
  }
}
