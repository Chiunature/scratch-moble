import type { LdrLoaderInstance, LdrStorage } from '../types';
import { getLdrOptions } from '../options';
import { resolveGeneratedParts, createFallbackPart } from '../loader/resolveGeneratedParts';

export function defaultFetchText(url: string): Promise<string> {
  return fetch(url).then(response => {
    if (!response.ok) {
      throw new Error(`HTTP ${response.status} for ${url}`);
    }
    return response.text();
  });
}

export class MemoryLdrStorage implements LdrStorage {
  private readonly entries = new Map<string, string>();

  async get(id: string): Promise<string | null> {
    return this.entries.get(normalizeId(id)) ?? null;
  }

  async set(id: string, text: string): Promise<void> {
    this.entries.set(normalizeId(id), text);
  }
}

export function createCachingStorageBackend(
  storage: LdrStorage,
): import('../types').LdrStorageBackend {
  return {
    retrievePartsFromStorage(loader: LdrLoaderInstance, ids: string[], onDone) {
      void resolveFromStorage(loader, ids, storage).then(onDone);
    },
  };
}

async function resolveFromStorage(
  loader: LdrLoaderInstance,
  ids: string[],
  storage: LdrStorage,
): Promise<string[]> {
  const remaining: string[] = [];

  for (const id of ids) {
    const cached = await storage.get(id);
    if (cached != null) {
      loader.parse(cached, id);
      continue;
    }
    remaining.push(id);
  }

  return resolveGeneratedParts(loader, remaining);
}

function shouldPreferGeneratedStud(id: string): boolean {
  const options = getLdrOptions();
  if (!options) {
    return false;
  }
  if (
    options.studHighContrast !== 1 &&
    !(options.studLogo > 0)
  ) {
    return false;
  }
  const base = id.replace(/\\/g, '/').toLowerCase();
  return base.startsWith('stud') || base.includes('/stud');
}

export async function loadPartContent(
  loader: LdrLoaderInstance,
  id: string,
  storage: LdrStorage,
  options: {
    readLocalPart?: (id: string) => Promise<string | null>;
    remoteUrls?: string[];
    fetchText?: (url: string) => Promise<string>;
  },
): Promise<boolean> {
  const normalizedId = normalizeId(id);

  // stud 高对比 / logo 开启时优先用 Generator，覆盖本地标准 stud.dat
  if (shouldPreferGeneratedStud(normalizedId)) {
    const generated = LDR.Generator?.make(normalizedId);
    if (generated) {
      loader.setPartType(generated);
      return true;
    }
  }

  try {
    const cached = await storage.get(normalizedId);
    if (cached != null) {
      loader.parse(cached, normalizedId);
      return true;
    }

    if (options.readLocalPart) {
      const localText = await options.readLocalPart(normalizedId);
      if (localText != null) {
        await storage.set(normalizedId, localText);
        loader.parse(localText, normalizedId);
        return true;
      }
    }

    const fetchText = options.fetchText ?? defaultFetchText;
    for (const url of options.remoteUrls ?? []) {
      try {
        const text = await fetchText(url);
        await storage.set(normalizedId, text);
        loader.parse(text, normalizedId);
        return true;
      } catch {
        // try next candidate
      }
    }
  } catch {
    // Fall through to generator / cube fallback so one bad .dat cannot blank the model.
  }

  const generated = LDR.Generator?.make(normalizedId);
  if (generated) {
    loader.setPartType(generated);
    return true;
  }

  createFallbackPart(loader, normalizedId);
  return false;
}

function normalizeId(id: string): string {
  return id.replace(/\\/g, '/').toLowerCase();
}
