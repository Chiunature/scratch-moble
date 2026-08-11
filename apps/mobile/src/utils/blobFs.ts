import ReactNativeBlobUtil from 'react-native-blob-util';

const FILE_PROTOCOL_PREFIX = 'file://';

/** react-native-blob-util 的 readFile 需要纯文件路径，剥离 file:// 前缀。 */
export function stripFileProtocol(uri: string): string {
  return uri.startsWith(FILE_PROTOCOL_PREFIX)
    ? uri.slice(FILE_PROTOCOL_PREFIX.length)
    : uri;
}

/** 以 utf8 读取本地文本文件；URI（file://...）或纯路径均可。 */
export async function readTextFile(uriOrPath: string): Promise<string> {
  return ReactNativeBlobUtil.fs.readFile(stripFileProtocol(uriOrPath), 'utf8');
}