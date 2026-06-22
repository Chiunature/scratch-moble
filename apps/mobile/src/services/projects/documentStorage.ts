import ReactNativeBlobUtil from 'react-native-blob-util';

import type {
  ScratchProjectDocument,
} from '@scratch-mobile/shared';
import {
  parseProjectDocumentJson,
  ProjectDocumentParseError,
  serializeProjectDocument,
} from '@scratch-mobile/core';

import {
  getProjectDocumentPath,
  getProjectDocumentTempPath,
  getProjectsDirectoryPath,
  PROJECT_DOCUMENT_EXTENSION,
} from './paths';

export { ProjectDocumentParseError };

async function ensureProjectsDirectory(): Promise<void> {
  const dir = getProjectsDirectoryPath();
  const exists = await ReactNativeBlobUtil.fs.exists(dir);
  if (!exists) {
    await ReactNativeBlobUtil.fs.mkdir(dir);
  }
}

export async function writeProjectDocument(
  document: ScratchProjectDocument,
): Promise<void> {
  await ensureProjectsDirectory();
  const finalPath = getProjectDocumentPath(document.id);
  const tempPath = getProjectDocumentTempPath(document.id);
  const payload = serializeProjectDocument(document);

  await ReactNativeBlobUtil.fs.writeFile(tempPath, payload, 'utf8');
  const finalExists = await ReactNativeBlobUtil.fs.exists(finalPath);
  if (finalExists) {
    await ReactNativeBlobUtil.fs.unlink(finalPath);
  }
  await ReactNativeBlobUtil.fs.mv(tempPath, finalPath);
}

export async function readProjectDocument(
  projectId: string,
): Promise<ScratchProjectDocument> {
  const path = getProjectDocumentPath(projectId);
  const exists = await ReactNativeBlobUtil.fs.exists(path);
  if (!exists) {
    throw new ProjectDocumentParseError(`Project file not found: ${projectId}`);
  }

  const raw = await ReactNativeBlobUtil.fs.readFile(path, 'utf8');
  return parseProjectDocumentJson(raw);
}

export async function deleteProjectDocument(projectId: string): Promise<void> {
  const path = getProjectDocumentPath(projectId);
  const tempPath = getProjectDocumentTempPath(projectId);
  const finalExists = await ReactNativeBlobUtil.fs.exists(path);
  if (finalExists) {
    await ReactNativeBlobUtil.fs.unlink(path);
  }
  const tempExists = await ReactNativeBlobUtil.fs.exists(tempPath);
  if (tempExists) {
    await ReactNativeBlobUtil.fs.unlink(tempPath);
  }
}

export async function projectDocumentExists(projectId: string): Promise<boolean> {
  return ReactNativeBlobUtil.fs.exists(getProjectDocumentPath(projectId));
}

function projectIdFromDocumentFilename(filename: string): string | null {
  if (
    !filename.endsWith(PROJECT_DOCUMENT_EXTENSION) ||
    filename.endsWith(`${PROJECT_DOCUMENT_EXTENSION}.tmp`)
  ) {
    return null;
  }
  return filename.slice(0, -PROJECT_DOCUMENT_EXTENSION.length);
}

export async function listProjectDocumentIds(): Promise<string[]> {
  await ensureProjectsDirectory();
  const dir = getProjectsDirectoryPath();
  const exists = await ReactNativeBlobUtil.fs.exists(dir);
  if (!exists) {
    return [];
  }

  const filenames = await ReactNativeBlobUtil.fs.ls(dir);
  return filenames
    .map(projectIdFromDocumentFilename)
    .filter((projectId): projectId is string => projectId != null);
}
