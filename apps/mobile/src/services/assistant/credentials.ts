import { kvStore } from '../storage/kvStore';

import { normalizeAssistantBaseUrl } from './openAiCompatible';
import type { AssistantConnectionProfile } from './types';

export type SecureValueStore = {
  getItemAsync: (key: string) => Promise<string | null>;
  setItemAsync: (key: string, value: string) => Promise<void>;
  deleteItemAsync: (key: string) => Promise<void>;
};

type StoredAssistantProfile = {
  id: string;
  baseUrl: string;
  model: string;
  supportsJsonSchema?: boolean;
  apiKeyStorageKey: string;
};

type StoredCatalog = {
  version: 2;
  activeId: string | null;
  profiles: StoredAssistantProfile[];
};

const PROFILE_STORAGE_KEY = 'assistant.connection.profile';
const API_KEY_PREFIX = 'assistant.connection.api-key.';

function assertProfileId(id: string): void {
  if (!/^[a-zA-Z0-9._-]{1,80}$/.test(id)) {
    throw new Error('助手连接配置 ID 无效。');
  }
}

export function normalizedProfile(
  profile: AssistantConnectionProfile,
): AssistantConnectionProfile {
  assertProfileId(profile.id);
  const baseUrl = normalizeAssistantBaseUrl(profile.baseUrl);
  if (!profile.model.trim() || profile.model.length > 200) {
    throw new Error('助手模型名称无效。');
  }
  if (
    profile.supportsJsonSchema !== undefined &&
    typeof profile.supportsJsonSchema !== 'boolean'
  ) {
    throw new Error('助手连接配置无效。');
  }
  return {
    id: profile.id,
    baseUrl,
    model: profile.model.trim(),
    ...(profile.supportsJsonSchema === undefined
      ? {}
      : { supportsJsonSchema: profile.supportsJsonSchema }),
  };
}

function apiKeyStorageKey(profile: AssistantConnectionProfile): string {
  // SecureStore key names only allow letters, digits, '.', '_' and '-'.
  const address = Array.from(profile.baseUrl, char =>
    char.charCodeAt(0).toString(16).padStart(4, '0'),
  ).join('');
  return `${API_KEY_PREFIX}${profile.id}.${address}`;
}

function isStoredProfile(value: unknown): value is StoredAssistantProfile {
  if (typeof value !== 'object' || value === null) return false;
  const record = value as Record<string, unknown>;
  return (
    typeof record.id === 'string' &&
    typeof record.baseUrl === 'string' &&
    typeof record.model === 'string' &&
    typeof record.apiKeyStorageKey === 'string' &&
    (record.supportsJsonSchema === undefined ||
      typeof record.supportsJsonSchema === 'boolean')
  );
}

function isStoredCatalog(value: unknown): value is StoredCatalog {
  if (typeof value !== 'object' || value === null) return false;
  const record = value as Record<string, unknown>;
  return (
    record.version === 2 &&
    (record.activeId === null || typeof record.activeId === 'string') &&
    Array.isArray(record.profiles) &&
    record.profiles.every(isStoredProfile)
  );
}

export class AssistantCredentialStore {
  constructor(private readonly secureStore: SecureValueStore) {}

  async save(
    profile: AssistantConnectionProfile,
    apiKey: string,
  ): Promise<void> {
    await this.upsert(profile, apiKey, true);
  }

  async upsert(
    profile: AssistantConnectionProfile,
    apiKey: string,
    makeActive: boolean,
  ): Promise<void> {
    const safeProfile = normalizedProfile(profile);
    const trimmedKey = apiKey.trim();
    if (!trimmedKey) {
      throw new Error('API Key 不能为空。');
    }

    const catalog = (await this.readCatalog()) ?? {
      version: 2 as const,
      activeId: null,
      profiles: [],
    };
    const nextKey = apiKeyStorageKey(safeProfile);
    const previous = catalog.profiles.find(item => item.id === safeProfile.id);
    if (
      previous &&
      previous.apiKeyStorageKey !== nextKey &&
      this.ownsKey(previous)
    ) {
      await this.secureStore.deleteItemAsync(previous.apiKeyStorageKey);
    }
    await this.secureStore.setItemAsync(nextKey, trimmedKey);
    const stored: StoredAssistantProfile = {
      ...safeProfile,
      apiKeyStorageKey: nextKey,
    };
    const profiles = catalog.profiles.filter(item => item.id !== safeProfile.id);
    const index = catalog.profiles.findIndex(item => item.id === safeProfile.id);
    if (index >= 0) {
      profiles.splice(index, 0, stored);
    } else {
      profiles.push(stored);
    }
    const activeStillPresent = profiles.some(item => item.id === catalog.activeId);
    const activeId = makeActive
      ? safeProfile.id
      : activeStillPresent
        ? catalog.activeId
        : safeProfile.id;
    try {
      await kvStore.setItem(
        PROFILE_STORAGE_KEY,
        JSON.stringify({ version: 2, activeId, profiles }),
      );
    } catch (error) {
      await this.secureStore.deleteItemAsync(nextKey);
      throw error;
    }
  }

  async load(): Promise<{
    profile: AssistantConnectionProfile;
    apiKey: string;
  } | null> {
    const listed = await this.list();
    return listed.profiles.find(item => item.profile.id === listed.activeId) ?? null;
  }

  async list(): Promise<{
    activeId: string | null;
    profiles: Array<{ profile: AssistantConnectionProfile; apiKey: string }>;
  }> {
    const catalog = await this.readCatalog();
    if (!catalog) return { activeId: null, profiles: [] };
    const profiles: Array<{ profile: AssistantConnectionProfile; apiKey: string }> =
      [];
    for (const stored of catalog.profiles) {
      const resolved = await this.resolveStored(stored);
      if (resolved) profiles.push(resolved);
    }
    const activeId = profiles.some(item => item.profile.id === catalog.activeId)
      ? catalog.activeId
      : null;
    return { activeId, profiles };
  }

  async setActive(id: string | null): Promise<void> {
    const catalog = await this.readCatalog();
    if (!catalog || (id && !catalog.profiles.some(item => item.id === id))) {
      throw new Error('找不到这个模型配置。');
    }
    await kvStore.setItem(
      PROFILE_STORAGE_KEY,
      JSON.stringify({ ...catalog, activeId: id }),
    );
  }

  async remove(id: string): Promise<void> {
    const catalog = await this.readCatalog();
    if (!catalog) return;
    const existing = catalog.profiles.find(item => item.id === id);
    if (!existing) return;
    if (this.ownsKey(existing)) {
      await this.secureStore.deleteItemAsync(existing.apiKeyStorageKey);
    }
    const profiles = catalog.profiles.filter(item => item.id !== id);
    if (profiles.length === 0) {
      await kvStore.removeItem(PROFILE_STORAGE_KEY);
      return;
    }
    await kvStore.setItem(
      PROFILE_STORAGE_KEY,
      JSON.stringify({
        version: 2,
        activeId: catalog.activeId === id ? null : catalog.activeId,
        profiles,
      }),
    );
  }

  async clear(): Promise<void> {
    const catalog = await this.readCatalogForDeletion();
    if (catalog) {
      for (const stored of catalog.profiles) {
        if (this.ownsKey(stored)) {
          await this.secureStore.deleteItemAsync(stored.apiKeyStorageKey);
        }
      }
    }
    // Keep this after SecureStore deletion so a native failure is propagated and
    // the metadata cannot falsely claim that the credential was cleared.
    await kvStore.removeItem(PROFILE_STORAGE_KEY);
  }

  private ownsKey(stored: StoredAssistantProfile): boolean {
    try {
      return stored.apiKeyStorageKey === apiKeyStorageKey(normalizedProfile(stored));
    } catch {
      return false;
    }
  }

  private async resolveStored(
    stored: StoredAssistantProfile,
  ): Promise<{ profile: AssistantConnectionProfile; apiKey: string } | null> {
    if (!this.ownsKey(stored)) return null;
    let apiKey: string | null;
    try {
      apiKey = await this.secureStore.getItemAsync(stored.apiKeyStorageKey);
    } catch {
      return null;
    }
    if (!apiKey?.trim()) return null;
    try {
      return { profile: normalizedProfile(stored), apiKey };
    } catch {
      return null;
    }
  }

  private async readCatalog(): Promise<StoredCatalog | null> {
    let raw: string | null;
    try {
      raw = await kvStore.getItem(PROFILE_STORAGE_KEY);
    } catch {
      return null;
    }
    if (!raw) return null;
    let value: unknown;
    try {
      value = JSON.parse(raw);
    } catch {
      await kvStore.removeItem(PROFILE_STORAGE_KEY);
      return null;
    }
    if (isStoredCatalog(value)) return value;
    if (isStoredProfile(value)) {
      return { version: 2, activeId: value.id, profiles: [value] };
    }
    await kvStore.removeItem(PROFILE_STORAGE_KEY);
    return null;
  }

  private async readCatalogForDeletion(): Promise<StoredCatalog | null> {
    const raw = await kvStore.getItem(PROFILE_STORAGE_KEY);
    if (!raw) return null;
    try {
      const value: unknown = JSON.parse(raw);
      if (isStoredCatalog(value)) return value;
      if (isStoredProfile(value)) {
        return { version: 2, activeId: value.id, profiles: [value] };
      }
      return null;
    } catch {
      return null;
    }
  }
}

export async function hasStoredAssistantProfile(): Promise<boolean> {
  return Boolean(await kvStore.getItem(PROFILE_STORAGE_KEY));
}

export function createAssistantCredentialStore(
  secureStore: SecureValueStore,
): AssistantCredentialStore {
  return new AssistantCredentialStore(secureStore);
}
