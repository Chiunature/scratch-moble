import {
  CURRENT_PROJECT_SCHEMA_VERSION,
  SCRATCH_BLOCKS_VERSION,
  type ScratchProjectDocument,
} from '@scratch-mobile/shared';

import { migrateProjectDocument } from './migrateProjectDocument';

export class ProjectDocumentParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ProjectDocumentParseError';
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readRequiredString(
  record: Record<string, unknown>,
  key: string,
): string {
  const value = record[key];
  if (typeof value !== 'string' || value.length === 0) {
    throw new ProjectDocumentParseError(`Missing or invalid "${key}"`);
  }
  return value;
}

function readSchemaVersion(record: Record<string, unknown>): number {
  const value = record.schemaVersion;
  if (typeof value !== 'number' || !Number.isInteger(value)) {
    throw new ProjectDocumentParseError('Missing or invalid "schemaVersion"');
  }
  return value;
}

function readEditorMeta(record: Record<string, unknown>): ScratchProjectDocument['editor'] {
  const editor = record.editor;
  if (!isRecord(editor)) {
    throw new ProjectDocumentParseError('Missing or invalid "editor"');
  }
  if (editor.scratchBlocksVersion !== SCRATCH_BLOCKS_VERSION) {
    throw new ProjectDocumentParseError('Unsupported scratchBlocksVersion');
  }
  return { scratchBlocksVersion: SCRATCH_BLOCKS_VERSION };
}

function readWorkspace(record: Record<string, unknown>): ScratchProjectDocument['workspace'] {
  if (!('workspace' in record)) {
    throw new ProjectDocumentParseError('Missing "workspace"');
  }
  const { workspace } = record;
  if (workspace === null) {
    return null;
  }
  if (workspace === undefined) {
    return null;
  }
  return workspace;
}

export function parseProjectDocumentJson(raw: string): ScratchProjectDocument {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new ProjectDocumentParseError('Invalid JSON');
  }

  if (!isRecord(parsed)) {
    throw new ProjectDocumentParseError('Project document must be an object');
  }

  const schemaVersion = readSchemaVersion(parsed);
  if (schemaVersion > CURRENT_PROJECT_SCHEMA_VERSION) {
    throw new ProjectDocumentParseError(
      `Unsupported schemaVersion ${schemaVersion}`,
    );
  }

  const draft: ScratchProjectDocument = {
    schemaVersion: schemaVersion as ScratchProjectDocument['schemaVersion'],
    id: readRequiredString(parsed, 'id'),
    name: readRequiredString(parsed, 'name'),
    createdAt: readRequiredString(parsed, 'createdAt'),
    updatedAt: readRequiredString(parsed, 'updatedAt'),
    editor: readEditorMeta(parsed),
    workspace: readWorkspace(parsed),
  };

  return migrateProjectDocument(draft);
}

export function serializeProjectDocument(
  document: ScratchProjectDocument,
): string {
  return JSON.stringify(document);
}
