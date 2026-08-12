import ReactNativeBlobUtil from 'react-native-blob-util';

const PROJECTS_DIR_NAME = 'projects';
const PROJECT_THUMBNAIL_EXTENSION = '.jpg';
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

export function getProjectThumbnailPath(
  projectId: string,
  version?: string | number,
): string {
  const suffix = version == null ? '' : `.${version}`;
  return `${getProjectsDirectoryPath()}/${projectId}${suffix}${PROJECT_THUMBNAIL_EXTENSION}`;
}

export function getProjectThumbnailTempPath(
  projectId: string,
  version?: string | number,
): string {
  return `${getProjectThumbnailPath(projectId, version)}.tmp`;
}
