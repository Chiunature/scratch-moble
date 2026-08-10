import {
  createSchemaReader,
  CURRENT_PROJECT_SCHEMA_VERSION,
  SCRATCH_BLOCKS_VERSION,
  type SchemaRecord,
  type ScratchProjectDocument,
} from '@scratch-mobile/shared';

import { migrateProjectDocument } from './migrateProjectDocument';

export class ProjectDocumentParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ProjectDocumentParseError';
  }
}

const schema = createSchemaReader(message => new ProjectDocumentParseError(message));

function readRequiredString(record: SchemaRecord, key: string): string {
  return schema.nonEmptyString(record, key, `Missing or invalid "${key}"`);
}

function readSchemaVersion(record: SchemaRecord): number {
  return schema.integer(
    record,
    'schemaVersion',
    'Missing or invalid "schemaVersion"',
  );
}

function readEditorMeta(record: SchemaRecord): ScratchProjectDocument['editor'] {
  const editor = schema.record(record.editor, 'Missing or invalid "editor"');
  if (editor.scratchBlocksVersion !== SCRATCH_BLOCKS_VERSION) {
    throw new ProjectDocumentParseError('Unsupported scratchBlocksVersion');
  }
  return { scratchBlocksVersion: SCRATCH_BLOCKS_VERSION };
}

function readWorkspace(record: SchemaRecord): ScratchProjectDocument['workspace'] {
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

  const parsedRecord = schema.record(
    parsed,
    'Project document must be an object',
  );

  const schemaVersion = readSchemaVersion(parsedRecord);
  if (schemaVersion > CURRENT_PROJECT_SCHEMA_VERSION) {
    throw new ProjectDocumentParseError(
      `Unsupported schemaVersion ${schemaVersion}`,
    );
  }

  const draft: ScratchProjectDocument = {
    schemaVersion: schemaVersion as ScratchProjectDocument['schemaVersion'],
    id: readRequiredString(parsedRecord, 'id'),
    name: readRequiredString(parsedRecord, 'name'),
    createdAt: readRequiredString(parsedRecord, 'createdAt'),
    updatedAt: readRequiredString(parsedRecord, 'updatedAt'),
    editor: readEditorMeta(parsedRecord),
    workspace: readWorkspace(parsedRecord),
  };

  return migrateProjectDocument(draft);
}

export function serializeProjectDocument(
  document: ScratchProjectDocument,
): string {
  return JSON.stringify(document);
}
