import {
  buildProjectDocument,
  createEmptyProjectDocument,
} from '@scratch-mobile/core';
import { getDefaultProjectName } from '@scratch-mobile/i18n';
import {
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
import {
  deleteProjectThumbnail,
  writeProjectThumbnail,
} from './thumbnailStorage';

const saveQueues = new Map<string, Promise<unknown>>();
let thumbnailVersionSequence = 0;

// RN Image 会按本地 URI 缓存；这里必须独立于每次进入编辑器都会重置的 workspace revision。
function nextThumbnailVersion(revision: number): string {
  thumbnailVersionSequence = (thumbnailVersionSequence + 1) % 100000;
  return `${Date.now()}-${revision}-${thumbnailVersionSequence}`;
}

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

  const documents = await Promise.all(
    documentIds.map(async documentId => {
      try {
        const document = await readProjectDocument(documentId);
        return { documentId, document };
      } catch (error) {
        if (error instanceof ProjectDocumentParseError) {
          return null;
        }
        throw error;
      }
    }),
  );

  for (const entry of documents) {
    if (entry == null) {
      continue;
    }
    const existing = indexById.get(entry.documentId);
    const summary = summaryFromDocument(
      entry.document,
      existing?.blockCount ?? 0,
    );
    // thumbnailPath 只存索引不存 document，reconcile 时从旧索引补回
    next.push(
      existing?.thumbnailPath
        ? { ...summary, thumbnailPath: existing.thumbnailPath }
        : summary,
    );
  }

  if (!summariesEquivalent(index, next)) {
    await saveProjectIndex(next);
  }

  return next;
}

/** Fast path: return the persisted list index without reading project bodies. */
export async function listProjects(): Promise<ScratchProjectSummary[]> {
  return loadProjectIndex();
}

/**
 * Rebuild the project index from on-disk documents (parallel reads).
 * Use for pull-to-refresh or background consistency checks.
 */
export async function reconcileProjects(): Promise<ScratchProjectSummary[]> {
  return reconcileProjectIndex();
}

export async function createProject(name?: string): Promise<ScratchProjectSummary> {
  const document = createEmptyProjectDocument(name ?? getDefaultProjectName());
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
  revision: number;
  /** 积木截图 JPEG dataURL，缺省表示无截图（空 workspace 或生成失败） */
  thumbnail?: string;
};

export async function saveProjectWorkspace(
  input: SaveProjectWorkspaceInput,
): Promise<ScratchProjectSummary> {
  return enqueueProjectSave(input.projectId, async () => {
    const now = new Date().toISOString();
    const index = await loadProjectIndex();
    const existing = index.find(project => project.id === input.projectId);

    // 缩略图落盘失败只降级封面（保留旧封面），不阻塞 workspace 保存
    let thumbnailPath = existing?.thumbnailPath;
    if (input.thumbnail) {
      const thumbnailVersion = nextThumbnailVersion(input.revision);
      try {
        const writtenThumbnailPath = await writeProjectThumbnail(
          input.projectId,
          input.thumbnail,
          {
            version: thumbnailVersion,
          },
        );
        thumbnailPath = writtenThumbnailPath ?? existing?.thumbnailPath;
      } catch {
        thumbnailPath = existing?.thumbnailPath;
      }
    }

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
          name: getDefaultProjectName(),
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
      thumbnailPath,
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
  await deleteProjectThumbnail(projectId).catch(() => undefined);
  const index = await loadProjectIndex();
  await saveProjectIndex(removeProjectSummary(index, projectId));
}

export async function waitForPendingProjectSaves(
  projectId: string,
): Promise<void> {
  await (saveQueues.get(projectId) ?? Promise.resolve());
}
