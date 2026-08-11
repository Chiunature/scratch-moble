import ReactNativeBlobUtil from 'react-native-blob-util';

const PROJECTS_DIR_NAME = 'projects';
export const PROJECT_DOCUMENT_EXTENSION = '.smproj.json';

export function getProjectsDirectoryPath(): string {
  return `${ReactNativeBlobUtil.fs.dirs.DocumentDir}/${PROJECTS_DIR_NAME}`;
}

export function getProjectDocumentPath(projectId: string): string {
  return `${getProjectsDirectoryPath()}/${projectId}${PROJECT_DOCUMENT_EXTENSION}`;
}

export function getProjectDocumentTempPath(projectId: string): string {
  return `${getProjectDocumentPath(projectId)}.tmp`;
}
