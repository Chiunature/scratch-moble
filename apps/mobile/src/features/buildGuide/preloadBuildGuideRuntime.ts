let preloadPromise: Promise<void> | null = null;

async function loadBuildGuideRuntime(): Promise<void> {
  // setupThreeRuntime must run before the LDraw vendor modules register globals.
  await import('./runtime/setupThreeRuntime');

  const { preloadBuildGuideMpdAssets } = await import('./data/bundles');
  await Promise.all([
    import('@scratch-mobile/ldr-engine'),
    import('../../screens/BuildGuidePickerScreen'),
    import('../../screens/BuildGuideScreen'),
    preloadBuildGuideMpdAssets(),
  ]);
}

/**
 * Warm the build-guide runtime during an idle window without blocking the
 * initial app module graph. Concurrent callers share the same request.
 */
export function preloadBuildGuideRuntime(): Promise<void> {
  if (preloadPromise) {
    return preloadPromise;
  }

  const request = loadBuildGuideRuntime();
  preloadPromise = request.catch(error => {
    preloadPromise = null;
    throw error;
  });
  return preloadPromise;
}