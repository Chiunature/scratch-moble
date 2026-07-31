/** 记录用户切步点击时刻（非 effect 执行时刻），供快速连点判定。 */
let lastStepNavigationAt = 0;

export function markStepNavigation(): void {
  lastStepNavigationAt = Date.now();
}

export function getLastStepNavigationAt(): number {
  return lastStepNavigationAt;
}
