import ReactNativeBlobUtil from 'react-native-blob-util';

import {
  getProjectThumbnailPath,
  getProjectThumbnailTempPath,
  getProjectsDirectoryPath,
} from './paths';

const THUMBNAIL_FILE_SUFFIX = '.jpg';
const THUMBNAIL_TEMP_FILE_SUFFIX = '.jpg.tmp';

/** dataURL（data:image/jpeg;base64,...）→ base64 主体，格式不符返回 null */
function base64FromDataUrl(dataUrl: string): string | null {
  const separatorIndex = dataUrl.indexOf(',');
  if (separatorIndex < 0) {
    return null;
  }
  const header = dataUrl.slice(0, separatorIndex);
  if (!header.startsWith('data:image/') || !header.endsWith(';base64')) {
    return null;
  }
  return dataUrl.slice(separatorIndex + 1);
}

function isProjectThumbnailFilename(projectId: string, filename: string): boolean {
  const isJpeg =
    filename.endsWith(THUMBNAIL_FILE_SUFFIX) ||
    filename.endsWith(THUMBNAIL_TEMP_FILE_SUFFIX);
  if (!isJpeg) {
    return false;
  }
  return filename === `${projectId}.jpg` || filename.startsWith(`${projectId}.`);
}

async function removeProjectThumbnailFiles(
  projectId: string,
  exceptPath?: string,
): Promise<void> {
  const dir = getProjectsDirectoryPath();
  if (!(await ReactNativeBlobUtil.fs.exists(dir))) {
    return;
  }

  const filenames = await ReactNativeBlobUtil.fs.ls(dir);
  for (const filename of filenames) {
    if (!isProjectThumbnailFilename(projectId, filename)) {
      continue;
    }
    const path = `${dir}/${filename}`;
    if (path === exceptPath) {
      continue;
    }
    await ReactNativeBlobUtil.fs.unlink(path).catch(() => undefined);
  }
}

export async function writeProjectThumbnail(
  projectId: string,
  dataUrl: string,
  options: { version: string },
): Promise<string | null> {
  const { version } = options;
  const base64 = base64FromDataUrl(dataUrl);
  if (!base64) {
    return null;
  }

  const dir = getProjectsDirectoryPath();
  if (!(await ReactNativeBlobUtil.fs.exists(dir))) {
    await ReactNativeBlobUtil.fs.mkdir(dir);
  }

  const finalPath = getProjectThumbnailPath(projectId, version);
  const tempPath = getProjectThumbnailTempPath(projectId, version);
  await ReactNativeBlobUtil.fs.writeFile(tempPath, base64, 'base64');
  if (await ReactNativeBlobUtil.fs.exists(finalPath)) {
    await ReactNativeBlobUtil.fs.unlink(finalPath);
  }
  await ReactNativeBlobUtil.fs.mv(tempPath, finalPath);
  await removeProjectThumbnailFiles(projectId, finalPath);
  return finalPath;
}

export async function deleteProjectThumbnail(projectId: string): Promise<void> {
  await removeProjectThumbnailFiles(projectId);
}