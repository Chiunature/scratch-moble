import {
  MPD_MANIFEST_VERSION,
  type MpdCamera,
  type MpdManifest,
  type RuntimeStepOverride,
} from './schema';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function readString(record: Record<string, unknown>, key: string): string {
  const value = record[key];
  if (typeof value !== 'string' || value.length === 0) {
    throw new Error(`manifest.${key} must be a non-empty string`);
  }
  return value;
}

function readNumber(record: Record<string, unknown>, key: string): number {
  const value = record[key];
  if (typeof value !== 'number' || Number.isNaN(value)) {
    throw new Error(`manifest.${key} must be a number`);
  }
  return value;
}

function readTuple3(record: Record<string, unknown>, key: string): [number, number, number] {
  const value = record[key];
  if (
    !Array.isArray(value) ||
    value.length !== 3 ||
    value.some(item => typeof item !== 'number')
  ) {
    throw new Error(`manifest.${key} must be a 3-number tuple`);
  }
  return [value[0], value[1], value[2]];
}

function parseCamera(raw: unknown, path: string): MpdCamera {
  if (!isRecord(raw)) {
    throw new Error(`${path} must be an object`);
  }

  return {
    position: readTuple3(raw, 'position'),
    target: readTuple3(raw, 'target'),
  };
}

function parseStepOverride(raw: unknown, index: number): RuntimeStepOverride {
  const path = `manifest.steps[${index}]`;
  if (!isRecord(raw)) {
    throw new Error(`${path} must be an object`);
  }

  const stepIndex = readNumber(raw, 'index');
  if (stepIndex !== index) {
    throw new Error(`${path}.index must equal ${index}`);
  }

  const override: RuntimeStepOverride = { index: stepIndex };

  if (raw.titleKey !== undefined) {
    override.titleKey = readString(raw, 'titleKey');
  }
  if (raw.descriptionKey !== undefined) {
    override.descriptionKey = readString(raw, 'descriptionKey');
  }
  if (raw.camera !== undefined) {
    override.camera = parseCamera(raw.camera, `${path}.camera`);
  }
  if (raw.displayScale !== undefined) {
    if (typeof raw.displayScale !== 'number' || raw.displayScale <= 0) {
      throw new Error(`${path}.displayScale must be a positive number`);
    }
    override.displayScale = raw.displayScale;
  }

  return override;
}

export function parseMpdManifest(raw: unknown): MpdManifest {
  if (!isRecord(raw)) {
    throw new Error('manifest must be an object');
  }

  const version = raw.version;
  if (version !== MPD_MANIFEST_VERSION) {
    throw new Error(`unsupported manifest version: ${String(version)}`);
  }

  const manifest: MpdManifest = {
    version: MPD_MANIFEST_VERSION,
    id: readString(raw, 'id'),
    nameKey: readString(raw, 'nameKey'),
    mpdUri: readString(raw, 'mpdUri'),
    mainModelId: readString(raw, 'mainModelId'),
  };

  if (raw.partsSource !== undefined) {
    const partsSource = raw.partsSource;
    if (
      partsSource !== 'local' &&
      partsSource !== 'remote' &&
      partsSource !== 'local-then-remote'
    ) {
      throw new Error('manifest.partsSource must be local, remote, or local-then-remote');
    }
    manifest.partsSource = partsSource;
  }

  if (raw.partsBaseUrl !== undefined) {
    manifest.partsBaseUrl = readString(raw, 'partsBaseUrl');
  }

  if (raw.mainModelColor !== undefined) {
    manifest.mainModelColor = readNumber(raw, 'mainModelColor');
  }
  if (raw.displayScale !== undefined) {
    manifest.displayScale = readNumber(raw, 'displayScale');
  }
  if (raw.cameraDefault !== undefined) {
    manifest.cameraDefault = parseCamera(raw.cameraDefault, 'manifest.cameraDefault');
  }

  if (raw.steps !== undefined) {
    if (!Array.isArray(raw.steps)) {
      throw new Error('manifest.steps must be an array');
    }
    manifest.steps = raw.steps.map((step, index) => parseStepOverride(step, index));
  }

  return manifest;
}
