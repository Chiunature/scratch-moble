import {
  buildProjectDocument,
  createEmptyProjectDocument,
} from '@scratch-mobile/core';
import {
  DEFAULT_PROJECT_NAME,
  type ScratchProjectDocument,
  type ScratchProjectSummary,
  type WorkspaceSnapshot,
} from '@scratch-mobile/shared';

import {
  deleteProjectDocument,
  listProjectDocumentIds,
  ProjectDocumentParseError,
  readProjectDocument,
  writeProjectDocument,
} from './documentStorage';
import {
  loadProjectIndex,
  removeProjectSummary,
  saveProjectIndex,
  upsertProjectSummary,
} from './indexStorage';

const saveQueues = new Map<string, Promise<unknown>>();

function enqueueProjectSave<T>(
  projectId: string,
  task: () => Promise<T>,
): Promise<T> {
  const previous = saveQueues.get(projectId) ?? Promise.resolve();
  const next = previous.catch(() => undefined).then(task);
  saveQueues.set(projectId, next);
  void next.finally(() => {
    if (saveQueues.get(projectId) === next) {
      saveQueues.delete(projectId);
    }
  });
  return next;
}

function summaryFromDocument(
  document: ScratchProjectDocument,
  blockCount?: number,
): ScratchProjectSummary {
  return {
    id: document.id,
    name: document.name,
    createdAt: document.createdAt,
    updatedAt: document.updatedAt,
    blockCount,
  };
}

function summariesEquivalent(
  left: ScratchProjectSummary[],
  right: ScratchProjectSummary[],
): boolean {
  if (left.length !== right.length) {
    return false;
  }

  const sortById = (items: ScratchProjectSummary[]) =>
    [...items].sort((a, b) => a.id.localeCompare(b.id));

  return sortById(left).every((item, index) => {
    const other = sortById(right)[index];
    return (
      item.id === other.id &&
      item.name === other.name &&
      item.createdAt === other.createdAt &&
      item.updatedAt === other.updatedAt &&
      (item.blockCount ?? 0) === (other.blockCount ?? 0)
    );
  });
}

async function reconcileProjectIndex(): Promise<ScratchProjectSummary[]> {
  const [index, documentIds] = await Promise.all([
    loadProjectIndex(),
    listProjectDocumentIds(),
  ]);
  const indexById = new Map(index.map(item => [item.id, item]));
  const next: ScratchProjectSummary[] = [];

  for (const documentId of documentIds) {
    try {
      const document = await readProjectDocument(documentId);
      const existing = indexById.get(documentId);
      next.push(
        summaryFromDocument(document, existing?.blockCount ?? 0),
      );
    } catch (error) {
      if (error instanceof ProjectDocumentParseError) {
        continue;
      }
      throw error;
    }
  }

  if (!summariesEquivalent(index, next)) {
    await saveProjectIndex(next);
  }

  return next;
}

export async function listProjects(): Promise<ScratchProjectSummary[]> {
  return reconcileProjectIndex();
}

export async function createProject(name?: string): Promise<ScratchProjectSummary> {
  const document = createEmptyProjectDocument(name);
  await writeProjectDocument(document);
  const summary = summaryFromDocument(document, 0);
  const index = await loadProjectIndex();
  await saveProjectIndex(upsertProjectSummary(index, summary));
  return summary;
}

export async function loadProject(
  projectId: string,
): Promise<ScratchProjectDocument> {
  return readProjectDocument(projectId);
}

export type SaveProjectWorkspaceInput = {
  projectId: string;
  workspace: WorkspaceSnapshot;
  blockCount: number;
};

export async function saveProjectWorkspace(
  input: SaveProjectWorkspaceInput,
): Promise<ScratchProjectSummary> {
  return enqueueProjectSave(input.projectId, async () => {
    const now = new Date().toISOString();
    const index = await loadProjectIndex();
    const existing = index.find(project => project.id === input.projectId);

    let document: ScratchProjectDocument;
    try {
      document = await readProjectDocument(input.projectId);
      document = {
        ...document,
        updatedAt: now,
        workspace: input.workspace,
      };
    } catch (error) {
      if (!(error instanceof ProjectDocumentParseError)) {
        throw error;
      }
      document = buildProjectDocument({
        summary: existing ?? {
          id: input.projectId,
          name: DEFAULT_PROJECT_NAME,
          createdAt: now,
          updatedAt: now,
          blockCount: 0,
        },
        workspace: input.workspace,
      });
      document.updatedAt = now;
    }

    await writeProjectDocument(document);

    const summary: ScratchProjectSummary = {
      id: document.id,
      name: document.name,
      createdAt: document.createdAt,
      updatedAt: now,
      blockCount: input.blockCount,
    };

    await saveProjectIndex(upsertProjectSummary(index, summary));
    return summary;
  });
}

export async function renameProject(
  projectId: string,
  name: string,
): Promise<ScratchProjectSummary> {
  const trimmed = name.trim();
  if (!trimmed) {
    throw new Error('Project name cannot be empty');
  }

  const now = new Date().toISOString();
  const index = await loadProjectIndex();
  const existing = index.find(project => project.id === projectId);
  if (!existing) {
    throw new Error(`Project not found: ${projectId}`);
  }

  const document = await readProjectDocument(projectId);
  const nextDocument: ScratchProjectDocument = {
    ...document,
    name: trimmed,
    updatedAt: now,
  };
  await writeProjectDocument(nextDocument);

  const summary: ScratchProjectSummary = {
    ...existing,
    name: trimmed,
    updatedAt: now,
  };
  await saveProjectIndex(upsertProjectSummary(index, summary));
  return summary;
}

export async function deleteProject(projectId: string): Promise<void> {
  await deleteProjectDocument(projectId);
  const index = await loadProjectIndex();
  await saveProjectIndex(removeProjectSummary(index, projectId));
}

export async function waitForPendingProjectSaves(
  projectId: string,
): Promise<void> {
  await (saveQueues.get(projectId) ?? Promise.resolve());
}
