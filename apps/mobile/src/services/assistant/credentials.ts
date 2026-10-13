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

export class AssistantCredentialStore {
  constructor(private readonly secureStore: SecureValueStore) {}

  async save(
    profile: AssistantConnectionProfile,
    apiKey: string,
  ): Promise<void> {
    const safeProfile = normalizedProfile(profile);
    if (!apiKey.trim()) {
      throw new Error('API Key 不能为空。');
    }

    // Remove the old address-bound credential before replacing it. A failed
    // delete must remain retryable; never orphan a key when changing endpoints.
    await this.clear();
    const key = apiKeyStorageKey(safeProfile);
    await this.secureStore.setItemAsync(key, apiKey.trim());
    const stored: StoredAssistantProfile = {
      ...safeProfile,
      apiKeyStorageKey: key,
    };
    try {
      await kvStore.setItem(PROFILE_STORAGE_KEY, JSON.stringify(stored));
    } catch (error) {
      await this.secureStore.deleteItemAsync(key);
      throw error;
    }
  }

  async load(): Promise<{
    profile: AssistantConnectionProfile;
    apiKey: string;
  } | null> {
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
    if (!isStoredProfile(value)) {
      await kvStore.removeItem(PROFILE_STORAGE_KEY);
      return null;
    }

    let profile: AssistantConnectionProfile;
    try {
      profile = normalizedProfile(value);
    } catch {
      await kvStore.removeItem(PROFILE_STORAGE_KEY);
      return null;
    }
    const expectedKey = apiKeyStorageKey(profile);
    if (value.apiKeyStorageKey !== expectedKey) {
      await kvStore.removeItem(PROFILE_STORAGE_KEY);
      return null;
    }

    let apiKey: string | null;
    try {
      apiKey = await this.secureStore.getItemAsync(value.apiKeyStorageKey);
    } catch {
      return null;
    }
    if (!apiKey?.trim()) return null;

    return { profile, apiKey };
  }

  async clear(): Promise<void> {
    const raw = await kvStore.getItem(PROFILE_STORAGE_KEY);
    if (raw) {
      let value: unknown;
      try {
        value = JSON.parse(raw);
      } catch {
        // The metadata is corrupt; there is no trustworthy key name to delete.
        value = null;
      }
      if (isStoredProfile(value)) {
        let expectedKey: string | undefined;
        try {
          expectedKey = apiKeyStorageKey(normalizedProfile(value));
        } catch {
          /* Invalid metadata. */
        }
        if (value.apiKeyStorageKey === expectedKey) {
          await this.secureStore.deleteItemAsync(expectedKey);
        }
      }
    }
    // Keep this after SecureStore deletion so a native failure is propagated and
    // the metadata cannot falsely claim that the credential was cleared.
    await kvStore.removeItem(PROFILE_STORAGE_KEY);
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
