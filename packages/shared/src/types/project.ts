import type { ProjectSchemaVersion } from '../schemas/project';

export type ProjectId = string;

/** Blockly workspace serialization payload from scratch-blocks. */
export type WorkspaceSnapshot = unknown;

export type ScratchProjectSummary = {
  id: ProjectId;
  name: string;
  createdAt: string;
  updatedAt: string;
  blockCount?: number;
};

export type ScratchProjectEditorMeta = {
  scratchBlocksVersion: '2.1.19';
};

export type ScratchProjectDocument = {
  schemaVersion: ProjectSchemaVersion;
  id: ProjectId;
  name: string;
  createdAt: string;
  updatedAt: string;
  editor: ScratchProjectEditorMeta;
  workspace: WorkspaceSnapshot | null;
};
