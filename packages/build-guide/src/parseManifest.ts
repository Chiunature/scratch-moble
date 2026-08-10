import { createSchemaReader, type SchemaRecord } from '@scratch-mobile/shared';

import {
  MPD_MANIFEST_VERSION,
  type MpdCamera,
  type MpdManifest,
  type RuntimeStepOverride,
} from './schema';

const schema = createSchemaReader();

function readString(record: SchemaRecord, key: string): string {
  return schema.nonEmptyString(
    record,
    key,
    `manifest.${key} must be a non-empty string`,
  );
}

function readNumber(record: SchemaRecord, key: string): number {
  return schema.number(record, key, `manifest.${key} must be a number`);
}

function readTuple3(record: SchemaRecord, key: string): [number, number, number] {
  return schema.tuple3(record, key, `manifest.${key} must be a 3-number tuple`);
}

function parseCamera(raw: unknown, path: string): MpdCamera {
  const camera = schema.record(raw, `${path} must be an object`);

  return {
    position: readTuple3(camera, 'position'),
    target: readTuple3(camera, 'target'),
  };
}

function parseStepOverride(raw: unknown, index: number): RuntimeStepOverride {
  const path = `manifest.steps[${index}]`;
  const step = schema.record(raw, `${path} must be an object`);

  const stepIndex = readNumber(step, 'index');
  if (stepIndex !== index) {
    throw new Error(`${path}.index must equal ${index}`);
  }

  const override: RuntimeStepOverride = { index: stepIndex };

  if (step.titleKey !== undefined) {
    override.titleKey = readString(step, 'titleKey');
  }
  if (step.descriptionKey !== undefined) {
    override.descriptionKey = readString(step, 'descriptionKey');
  }
  if (step.camera !== undefined) {
    override.camera = parseCamera(step.camera, `${path}.camera`);
  }
  if (step.displayScale !== undefined) {
    override.displayScale = schema.positiveNumber(
      step,
      'displayScale',
      `${path}.displayScale must be a positive number`,
    );
  }

  return override;
}

export function parseMpdManifest(raw: unknown): MpdManifest {
  const manifestRecord = schema.record(raw, 'manifest must be an object');

  const version = manifestRecord.version;
  if (version !== MPD_MANIFEST_VERSION) {
    throw new Error(`unsupported manifest version: ${String(version)}`);
  }

  const manifest: MpdManifest = {
    version: MPD_MANIFEST_VERSION,
    id: readString(manifestRecord, 'id'),
    nameKey: readString(manifestRecord, 'nameKey'),
    mpdUri: readString(manifestRecord, 'mpdUri'),
    mainModelId: readString(manifestRecord, 'mainModelId'),
  };

  if (manifestRecord.partsSource !== undefined) {
    const partsSource = schema.oneOf(
      manifestRecord.partsSource,
      ['local', 'remote', 'local-then-remote'] as const,
      'manifest.partsSource must be local, remote, or local-then-remote',
    );
    manifest.partsSource = partsSource;
  }

  if (manifestRecord.partsBaseUrl !== undefined) {
    manifest.partsBaseUrl = readString(manifestRecord, 'partsBaseUrl');
  }

  if (manifestRecord.mainModelColor !== undefined) {
    manifest.mainModelColor = readNumber(manifestRecord, 'mainModelColor');
  }
  if (manifestRecord.mode !== undefined) {
    manifest.mode = schema.oneOf(
      manifestRecord.mode,
      ['instruction', 'preview'] as const,
      'manifest.mode must be instruction or preview',
    );
  }
  if (manifestRecord.displayScale !== undefined) {
    manifest.displayScale = readNumber(manifestRecord, 'displayScale');
  }
  if (manifestRecord.cameraDefault !== undefined) {
    manifest.cameraDefault = parseCamera(manifestRecord.cameraDefault, 'manifest.cameraDefault');
  }

  if (manifestRecord.steps !== undefined) {
    const steps = schema.array(manifestRecord.steps, 'manifest.steps must be an array');
    manifest.steps = steps.map((step, index) => parseStepOverride(step, index));
  }

  return manifest;
}
