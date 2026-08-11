import { MEDIA_BASE_URL } from './constants';
import { SOUND_ASSETS } from './soundAssets';

type FetchInput = Parameters<typeof window.fetch>[0];
type FetchInit = Parameters<typeof window.fetch>[1];

const getFetchUrl = (input: FetchInput): string | null => {
  if (typeof input === 'string') {
    return input;
  }
  if (typeof URL !== 'undefined' && input instanceof URL) {
    return input.href;
  }
  if (typeof Request !== 'undefined' && input instanceof Request) {
    return input.url;
  }
  return null;
};

const decodeBase64Buffer = (base64: string): ArrayBuffer => {
  const binary = atob(base64);
  const buffer = new ArrayBuffer(binary.length);
  const bytes = new Uint8Array(buffer);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return buffer;
};

const toSoundAssetName = (url: string): keyof typeof SOUND_ASSETS | null => {
  if (!url.startsWith(MEDIA_BASE_URL)) {
    return null;
  }
  const assetName = url.slice(MEDIA_BASE_URL.length);
  return assetName in SOUND_ASSETS ? (assetName as keyof typeof SOUND_ASSETS) : null;
};

let isPatched = false;

export function patchMediaFetch(): void {
  if (isPatched) {
    return;
  }
  isPatched = true;

  const originalFetch = window.fetch.bind(window);

  window.fetch = (input: FetchInput, init?: FetchInit): ReturnType<typeof window.fetch> => {
    const url = getFetchUrl(input);
    const soundAssetName = url == null ? null : toSoundAssetName(url);

    if (soundAssetName != null) {
      return Promise.resolve(
        new Response(decodeBase64Buffer(SOUND_ASSETS[soundAssetName]), {
          headers: {
            'Content-Type': 'audio/mpeg',
          },
        }),
      );
    }

    return originalFetch(input, init);
  };
}