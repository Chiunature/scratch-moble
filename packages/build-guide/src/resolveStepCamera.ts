import type { MpdCamera, MpdManifest } from './schema';

/**
 * Resolve the camera pose for a step: the per-step override wins, then the
 * manifest-level default. Returns undefined when neither is configured.
 */
export function resolveStepCamera(
  manifest: MpdManifest,
  stepIndex: number,
): MpdCamera | undefined {
  return (
    manifest.steps?.find((step) => step.index === stepIndex)?.camera ??
    manifest.cameraDefault
  );
}