import {
  BAKED_MANIFEST_VERSION,
  type BakedCamera,
  type BakedManifest,
  type BakedPart,
  type BakedStep,
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

function readStringArray(record: Record<string, unknown>, key: string): string[] {
  const value = record[key];
  if (!Array.isArray(value) || value.some(item => typeof item !== 'string')) {
    throw new Error(`manifest.${key} must be a string array`);
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

function parsePart(raw: unknown, path: string): BakedPart {
  if (!isRecord(raw)) {
    throw new Error(`${path} must be an object`);
  }

  const part: BakedPart = {
    id: readString(raw, 'id'),
    nameKey: readString(raw, 'nameKey'),
  };

  if (raw.color !== undefined) {
    if (typeof raw.color !== 'string') {
      throw new Error(`${path}.color must be a string`);
    }
    part.color = raw.color;
  }

  return part;
}

function parseCamera(raw: unknown, path: string): BakedCamera {
  if (!isRecord(raw)) {
    throw new Error(`${path} must be an object`);
  }

  return {
    position: readTuple3(raw, 'position'),
    target: readTuple3(raw, 'target'),
  };
}

function parseStep(raw: unknown, index: number): BakedStep {
  const path = `manifest.steps[${index}]`;
  if (!isRecord(raw)) {
    throw new Error(`${path} must be an object`);
  }

  const step: BakedStep = {
    id: readString(raw, 'id'),
    index: readNumber(raw, 'index'),
    titleKey: readString(raw, 'titleKey'),
    descriptionKey: readString(raw, 'descriptionKey'),
    glb: readString(raw, 'glb'),
    parts: [],
    newPartIds: readStringArray(raw, 'newPartIds'),
  };

  if (step.index !== index) {
    throw new Error(`${path}.index must equal ${index}`);
  }

  const parts = raw.parts;
  if (!Array.isArray(parts)) {
    throw new Error(`${path}.parts must be an array`);
  }
  step.parts = parts.map((part, partIndex) =>
    parsePart(part, `${path}.parts[${partIndex}]`),
  );

  if (raw.camera !== undefined) {
    step.camera = parseCamera(raw.camera, `${path}.camera`);
  }

  if (raw.displayScale !== undefined) {
    if (typeof raw.displayScale !== 'number' || raw.displayScale <= 0) {
      throw new Error(`${path}.displayScale must be a positive number`);
    }
    step.displayScale = raw.displayScale;
  }

  return step;
}

export function parseBakedManifest(raw: unknown): BakedManifest {
  if (!isRecord(raw)) {
    throw new Error('manifest must be an object');
  }

  const version = raw.version;
  if (version !== BAKED_MANIFEST_VERSION) {
    throw new Error(`unsupported manifest version: ${String(version)}`);
  }

  const stepsRaw = raw.steps;
  if (!Array.isArray(stepsRaw) || stepsRaw.length === 0) {
    throw new Error('manifest.steps must be a non-empty array');
  }

  const steps = stepsRaw.map((step, index) => parseStep(step, index));

  return {
    version: BAKED_MANIFEST_VERSION,
    id: readString(raw, 'id'),
    nameKey: readString(raw, 'nameKey'),
    steps,
  };
}
