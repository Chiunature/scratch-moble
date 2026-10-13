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
let sessionConnection: AssistantConnection | null = null;
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
function copy(connection: AssistantConnection): AssistantConnection {
  return {
    profile: normalizedProfile(connection.profile),
    apiKey: connection.apiKey,
  };
}
export async function getAssistantConnection(): Promise<AssistantConnection | null> {
  if (sessionConnection) return copy(sessionConnection);
  const loaded = await credentialStore()?.load();
  return loaded ? copy(loaded) : null;
}
export async function saveAssistantConnection(
  profile: AssistantConnectionProfile,
  apiKey: string,
  persist: boolean,
): Promise<void> {
  const safeProfile = normalizedProfile(profile);
  if (!apiKey.trim()) throw new Error('API Key 不能为空。');
  if (persist) {
    const store = credentialStore();
    if (!store)
      throw new Error(
        '系统安全存储不可用，请安装 expo-secure-store 并重新构建 App，或选择仅本次会话。',
      );
    try {
      await store.save(safeProfile, apiKey.trim());
    } catch {
      throw new Error('安全凭据保存失败，请解锁设备并检查存储空间后重试。');
    }
    sessionConnection = null;
  } else {
    await clearAssistantConnection();
    sessionConnection = { profile: safeProfile, apiKey: apiKey.trim() };
  }
}
export async function clearAssistantConnection(): Promise<void> {
  sessionConnection = null;
  const store = credentialStore();
  if (store) {
    try {
      await store.clear();
    } catch {
      throw new Error('安全凭据删除失败，请解锁设备后重试。');
    }
  } else if (await hasStoredAssistantProfile()) {
    throw new Error(
      '此构建无法删除之前保存的安全凭据。请使用包含安全存储的构建清除，或到模型服务商撤销 Key。',
    );
  }
}
