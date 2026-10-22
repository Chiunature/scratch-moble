import { requireOptionalNativeModule } from 'expo';
import {
  createAssistantCredentialStore,
  hasStoredAssistantProfile,
  normalizedProfile,
  type SecureValueStore,
} from './credentials';
import type { AssistantConnectionProfile } from './types';

export type AssistantConnection = {
  profile: AssistantConnectionProfile;
  apiKey: string;
};

export type AssistantConnectionRecord = AssistantConnection & {
  persisted: boolean;
  active: boolean;
};
// The optional native lookup allows existing development builds to use session
// credentials until expo-secure-store is installed and the native app is rebuilt.
type SecureStoreNative = {
  getValueWithKeyAsync: (
    key: string,
    options: object,
  ) => Promise<string | null>;
  setValueWithKeyAsync: (
    value: string,
    key: string,
    options: object,
  ) => Promise<void>;
  deleteValueWithKeyAsync: (key: string, options: object) => Promise<void>;
};
type RuntimeProfile = AssistantConnection & { persisted: boolean };

let sessionProfiles: RuntimeProfile[] = [];
// undefined follows the persisted active id. null means nothing is active.
let activeOverride: string | null | undefined;
function getSecureStoreNative(): SecureStoreNative | null {
  try {
    return requireOptionalNativeModule<SecureStoreNative>('ExpoSecureStore');
  } catch {
    return null;
  }
}
export function isAssistantSecureStorageAvailable(): boolean {
  return getSecureStoreNative() !== null;
}
function credentialStore() {
  const native = getSecureStoreNative();
  if (!native) return null;
  const adapter: SecureValueStore = {
    getItemAsync: key => native.getValueWithKeyAsync(key, {}),
    setItemAsync: (key, value) => native.setValueWithKeyAsync(value, key, {}),
    deleteItemAsync: key => native.deleteValueWithKeyAsync(key, {}),
  };
  return createAssistantCredentialStore(adapter);
}
const UNAVAILABLE_SECURE_STORE =
  '系统安全存储不可用，请安装 expo-secure-store 并重新构建 App，或选择仅本次会话。';
const SAVE_FAILED = '安全凭据保存失败，请解锁设备并检查存储空间后重试。';
const DELETE_FAILED = '安全凭据删除失败，请解锁设备后重试。';
const CANNOT_DELETE_STORED =
  '此构建无法删除之前保存的安全凭据。请使用包含安全存储的构建清除，或到模型服务商撤销 Key。';

function resetSession(): void {
  sessionProfiles = [];
  activeOverride = undefined;
}

async function readPersisted(): Promise<{
  activeId: string | null;
  profiles: AssistantConnection[];
}> {
  const store = credentialStore();
  if (!store) return { activeId: null, profiles: [] };
  return store.list();
}

function resolveActiveId(
  persistedActiveId: string | null,
  ids: ReadonlySet<string>,
): string | null {
  if (activeOverride !== undefined) {
    return activeOverride && ids.has(activeOverride) ? activeOverride : null;
  }
  return persistedActiveId && ids.has(persistedActiveId) ? persistedActiveId : null;
}

async function snapshot(): Promise<AssistantConnectionRecord[]> {
  const persisted = await readPersisted();
  const byId = new Map<string, RuntimeProfile>();
  for (const item of persisted.profiles) {
    byId.set(item.profile.id, {
      profile: item.profile,
      apiKey: item.apiKey,
      persisted: true,
    });
  }
  for (const item of sessionProfiles) {
    byId.set(item.profile.id, {
      profile: item.profile,
      apiKey: item.apiKey,
      persisted: false,
    });
  }
  const merged = [...byId.values()];
  const activeId = resolveActiveId(
    persisted.activeId,
    new Set(merged.map(item => item.profile.id)),
  );
  return merged.map(item => ({
    profile: { ...item.profile },
    apiKey: item.apiKey,
    persisted: item.persisted,
    active: item.profile.id === activeId,
  }));
}

export async function listAssistantConnections(): Promise<AssistantConnectionRecord[]> {
  return snapshot();
}

export async function getAssistantConnection(): Promise<AssistantConnection | null> {
  const active = (await snapshot()).find(item => item.active);
  return active ? { profile: { ...active.profile }, apiKey: active.apiKey } : null;
}

export async function activateAssistantConnection(id: string): Promise<void> {
  const target = (await snapshot()).find(item => item.profile.id === id);
  if (!target) throw new Error('找不到这个模型配置。');
  if (!target.persisted) {
    activeOverride = id;
    return;
  }
  const store = credentialStore();
  if (!store) throw new Error(UNAVAILABLE_SECURE_STORE);
  await store.setActive(id);
  activeOverride = undefined;
}

export async function deleteAssistantConnection(id: string): Promise<void> {
  const target = (await snapshot()).find(item => item.profile.id === id);
  if (!target) return;
  if (target.persisted) {
    const store = credentialStore();
    if (!store) {
      if (await hasStoredAssistantProfile()) throw new Error(CANNOT_DELETE_STORED);
      return;
    }
    try {
      await store.remove(id);
    } catch {
      throw new Error(DELETE_FAILED);
    }
  }
  sessionProfiles = sessionProfiles.filter(item => item.profile.id !== id);
  if (target.active) activeOverride = null;
}

export async function saveAssistantConnection(
  profile: AssistantConnectionProfile,
  apiKey: string,
  persist: boolean,
): Promise<void> {
  const safeProfile = normalizedProfile(profile);
  const trimmedKey = apiKey.trim();
  if (!trimmedKey) throw new Error('API Key 不能为空。');
  const current = await snapshot();
  const wasActive = current.some(item => item.profile.id === safeProfile.id && item.active);
  const otherActive = current.some(item => item.active && item.profile.id !== safeProfile.id);
  const makeActive = wasActive || !otherActive;
  if (persist) {
    const store = credentialStore();
    if (!store) throw new Error(UNAVAILABLE_SECURE_STORE);
    try {
      await store.upsert(safeProfile, trimmedKey, makeActive);
    } catch {
      throw new Error(SAVE_FAILED);
    }
    sessionProfiles = sessionProfiles.filter(item => item.profile.id !== safeProfile.id);
    if (makeActive) activeOverride = undefined;
    return;
  }
  if (!credentialStore() && (await hasStoredAssistantProfile())) {
    throw new Error(CANNOT_DELETE_STORED);
  }
  const store = credentialStore();
  if (store) {
    try {
      await store.remove(safeProfile.id);
    } catch {
      throw new Error(DELETE_FAILED);
    }
  }
  sessionProfiles = sessionProfiles.filter(item => item.profile.id !== safeProfile.id);
  sessionProfiles.push({
    profile: safeProfile,
    apiKey: trimmedKey,
    persisted: false,
  });
  if (makeActive) activeOverride = safeProfile.id;
}

export async function clearAssistantConnection(): Promise<void> {
  resetSession();
  const store = credentialStore();
  if (store) {
    try {
      await store.clear();
    } catch {
      throw new Error(DELETE_FAILED);
    }
    return;
  }
  if (await hasStoredAssistantProfile()) throw new Error(CANNOT_DELETE_STORED);
}
