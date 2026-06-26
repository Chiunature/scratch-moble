import {
  CURRENT_PROJECT_SCHEMA_VERSION,
  SCRATCH_BLOCKS_VERSION,
  type ScratchProjectDocument,
  type ScratchProjectSummary,
  type WorkspaceSnapshot,
} from '@scratch-mobile/shared';

export type CreateProjectSummaryOptions = {
  id?: string;
  name?: string;
  now?: string;
};

function fallbackProjectId(): string {
  return `project-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function createProjectId(): string {
  const cryptoObject = (globalThis as Record<string, unknown>).crypto as
    | { randomUUID?: () => string }
    | undefined;
  if (typeof cryptoObject?.randomUUID === 'function') {
    return cryptoObject.randomUUID();
  }
  return fallbackProjectId();
}

export function createProjectSummary(
  name: string,
  options?: CreateProjectSummaryOptions,
): ScratchProjectSummary {
  const now = options?.now ?? new Date().toISOString();
  return {
    id: options?.id ?? createProjectId(),
    name,
    createdAt: now,
    updatedAt: now,
    blockCount: 0,
  };
}

export type BuildProjectDocumentInput = {
  summary: ScratchProjectSummary;
  workspace?: WorkspaceSnapshot | null;
};

export function buildProjectDocument(
  input: BuildProjectDocumentInput,
): ScratchProjectDocument {
  const { summary, workspace = null } = input;
  return {
    schemaVersion: CURRENT_PROJECT_SCHEMA_VERSION,
    id: summary.id,
    name: summary.name,
    createdAt: summary.createdAt,
    updatedAt: summary.updatedAt,
    editor: {
      scratchBlocksVersion: SCRATCH_BLOCKS_VERSION,
    },
    workspace,
  };
}

export function createEmptyProjectDocument(
  name: string,
  options?: CreateProjectSummaryOptions,
): ScratchProjectDocument {
  const summary = createProjectSummary(name, options);
  return buildProjectDocument({ summary, workspace: null });
}
