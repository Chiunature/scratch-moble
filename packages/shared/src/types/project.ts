import { SCRATCH_BLOCKS_VERSION } from '../constants/app';
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
  /** 积木工作区截图文件路径（本地绝对路径），无截图时缺省 */
  thumbnailPath?: string;
};

export type ScratchProjectEditorMeta = {
  scratchBlocksVersion: typeof SCRATCH_BLOCKS_VERSION;
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
